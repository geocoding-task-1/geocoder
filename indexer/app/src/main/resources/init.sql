
--- Those two indexes definitely should not be added here, but during processing OSM tables, however
--- due to lack of time, I don't configure the import with lua scripts...
CREATE INDEX IF NOT EXISTS point_street
  ON planet_osm_point ("addr:street");

CREATE INDEX IF NOT EXISTS polygon_street
  ON planet_osm_polygon ("addr:street");


CREATE TABLE IF NOT EXISTS PLACES (
	osm_id bigint,
	street text,
  	house_number text,
	zip_code text,
	city text,
	centre geometry,
	rank int
);

--- These indexes are to try to make searching a bit more fuzzy
CREATE INDEX IF NOT EXISTS places_city
  ON places (soundex(city));

CREATE INDEX IF NOT EXISTS places_street
  ON places (soundex(street));

