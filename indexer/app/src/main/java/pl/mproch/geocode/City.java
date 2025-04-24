package pl.mproch.geocode;

import java.util.Optional;

import net.postgis.jdbc.jts.JtsGeometry;

public record City(long osmId, String name, JtsGeometry geometry, Optional<Long> population) {
    
    boolean contains(JtsGeometry point) {
        return geometry.getGeometry().contains(point.getGeometry());
    }

}
