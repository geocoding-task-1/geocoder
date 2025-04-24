package pl.mproch.geocode;

import java.nio.charset.StandardCharsets;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

import net.postgis.jdbc.jts.JtsGeometry;

public class Places {

    private static Logger logger = LoggerFactory.getLogger(Places.class);

    private JdbcTemplate template;

    private int batchSize = 10000;

    public Places(String host, String user, String password) throws Exception {
        // This should not be needed, but somehow the driver is not registered correctly.
        Class.forName("net.postgis.jdbc.jts.JtsWrapper");
        var dataSource = new DriverManagerDataSource(String.format("jdbc:postgres_jts://%s:5432/o2p", host), user, password);
        template = new JdbcTemplate(dataSource);
    }

    // Liquibase or similar solution should be used to handle database schema migrations. 
    void initialise() throws Exception {
        var initScript = new ClassPathResource("init.sql").getContentAsString(StandardCharsets.UTF_8);
        template.update(initScript);
    }

    void index() throws Exception {

        // We cache all "cities" (I know this term is probably not correct, but just as an illustration)
        var cities = template.queryForList("""
            SELECT osm_id, name, way, population 
            FROM planet_osm_polygon WHERE 
            boundary = 'administrative' AND admin_level IN ('7', '8') 
        """).stream().map(city -> 
            new City(
                (long) city.get("osm_id"), 
                (String) city.get("name"), 
                (JtsGeometry) city.get("way"), 
                Optional.ofNullable((String) city.get("population")).map(Long::parseLong)
            )
        ).collect(Collectors.groupingBy(city -> city.name()));
        
        logger.info("Loaded {} cities", cities.size());

        // Only full index is performed. If partial ones should be used, probably some version column would be needed
        template.update("TRUNCATE places");
        template.query("""
            SELECT osm_id, "addr:street", "addr:housenumber", "addr:city", "addr:postcode", ST_CENTROID(way) AS centre
            FROM planet_osm_polygon WHERE "addr:housenumber" IS NOT NULL
        """, new Processor(new Cities(cities)));
    }

    // The processing could be made parallelizable - e.g. collect raw data in batches,
    // and let some workers process each batch independently. Of course, care would need 
    // to be taken about error handling and transactions. 
    private class Processor implements RowCallbackHandler {

        private Cities cities;

        private Processor(Cities  cities) {
            this.cities = cities;
        }

        private List<Place> buffer = new ArrayList<>();

        @Override
        public void processRow(ResultSet rs) throws SQLException {
            var centre = (JtsGeometry) rs.getObject("centre");
            var city = Optional.ofNullable(rs.getString("addr:city")).or(() -> cities.cityNameFor(centre)).orElse(null);

            int rank = cities.cityRank(centre, city);
            var place = new Place(
                rs.getLong("osm_id"), 
                city, 
                rs.getString("addr:street"), 
                rs.getString("addr:housenumber"), 
                rs.getString("addr:postcode"), 
                centre, 
                rank
            );
            buffer.add(place);

            if (buffer.size() >= batchSize) {
                logger.info("Processing buffer, current row is {}", rs.getRow());
                saveBuffer();
            }
        }

        private void saveBuffer() {
            template.batchUpdate("""
                INSERT INTO places (
                    osm_id,
                    city,
                    street,
                    house_number,
                    zip_code,
                    centre,
                    rank
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?
                )
            """, new BatchPreparedStatementSetter() {

                @Override
                public void setValues(PreparedStatement ps, int row) throws SQLException {
                    var place = buffer.get(row);
                    ps.setLong(1, place.osmId());
                    ps.setString(2, place.city());
                    ps.setString(3, place.street());
                    ps.setString(4, place.houseNumber());
                    ps.setString(5, place.zipCode());
                    ps.setObject(6, place.centre());
                    ps.setInt(7, place.rank());
                }

                @Override
                public int getBatchSize() {
                    return buffer.size();
                }
                
            });
            buffer.clear();
        }

    }
}

