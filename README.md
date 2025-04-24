# Geocoder

> **_NOTE:_**  This is my very first attempt at writing an application dealing with geospatial data. 
  I've spent quite a lot of time on understanding the data and tools, so this speaks more about my ability
  to learn things quickly than about anything else :)
                

## Architecture 

My inspiration was the documentation of the architecture of [Nominatim](https://nominatim.org/release-docs/latest/develop/overview/). Of course, my implementation 
is very naive and simplistic compared to the real thing, but the general setup is similar:
- The data is kept in PostGIS
- The data ingestion happens in two stages:
  - Import raw OSM data
  - Do some preprocessing to make geocoding easier

## Setup instructions

### Running
- `curl https://download.geofabrik.de/europe/poland/mazowieckie-latest.osm.pbf -o ./docker/data/mazowieckie-latest.osm.pbf` to download sample data
- `docker-compose up` - to start all long running services
- `docker-compose run ingest` - to import OSM data into the database
- `docker-compose run indexer` - to prepare `places` table 

### API

- `curl http://localhost:8081/geocode?city=Warszawa&street=Popularna&houseNumber=8/10` - passing city, street and house number as query parameters
- `curl http://localhost:8081/geocode-query?query=Warszawa,%20Popularna%208/10` - passing address as a more free-form query
- `curl http://localhost:8081/reverse-geocode?lon=20.91&lat=52.20` 

### Development

- `server` - fairly standard node setup, run with `yarn dev`
- `indexer` - again, fairly standard Gradle project, using Java 21

## Data

I decided to use OSM data, as a data sample it is the region surrounding Warsaw. I use the `.pbf` file available at OSM data mirrors. 

## Technologies used

I decided to keep the stack simple and similar to one that is used at MapTiler (at least the parts I know about).

### Data ingestion

For initial data import from OSM I just use `osm2psql`, with very little configuration, as I didn't have time neither for 
writing custom lua scripts, nor to try to use Java libraries for parsing `.pbf` format. 
The next step is preparing additional table, `PLACES` for geocoding. This is handle by `indexer` service, written in Java. 

This service is very minimalistic, it's just a very simple standalone Java application. The data access is implemented with Spring
`JdbcTemplate`, even though the application is not a Spring-based one. I think in its current form it's simple enough to be implemented
using almost only standard library. In its current form the processing is very simple - it tries to augment some additional data to the
tags already present in OSM data, and computes some fake ranking of a place. 

Currently, there is only complete ingestion - i.e. wipe out previous data and import from scratch.

### Server

For query service, I picked simple stack based on TypeScript and NodeJS. The API is exposed with `express` and the 
integration with PostGIS is done using `postgres.js`. 
There is a also an integration with Prometheus and Grafana. I don't have any experience with NodeJS services, so I 
decided to start with something standard. 
In the current form, most of the work is done by the database, so scaling the server should not be a particular problem.

The geocoding is implemented in two flavors (both use `PLACES` table prepared by `indexer`):
- passing street, city and house number. We query the table, the only non-standard thing is to try to fix typos by trying some fuzzy searches. 
- passing query string. In this mode, first some simple parsing is done to detect various forms of the input data (currently it's very basic, but
  this could be improved a lot, also using additional data)

The reverse geocoding is based on the tables fed by `osm2psql`:
- first we find all areas that contain given point
- then we find the streets in those areas, ordered by distance to the point
- then we find buildings (either points or polygons) in the area and in those streets, ordering by distance

Both algorithms are probably very naive and need a lot of tweaking, but this was my first attempt at such a task. 

## Further work, scaling etc. 

This algorithms are very naive, a lot of work needs
Also, as I've spent quite some time getting used to the OSM/PostGIS data, the code quality is not really a production one. 
In particular, a lot of tests (e.g. integration ones) are missing, and also some better domain modelling is needed. 

In terms of scaling, there are two major ways of improvements:
- make data ingestion more efficient and parallelizable. This highly depends on what processing would be needed - e.g. 
  how augmenting places with correct address information would actually be done. 
- introduce some form of partitioning of the data in the database. For some types of queries it would be probably
  quite easy (e.g. given a point it's easy to assign a country it belongs to), for geocoding it might be a bit more 
  problematic.  
Additionally, if some parts of the query handling could be off-loaded from the database to the server itself 
(e.g. cache some of the data, implement more complex parsing of the query etc.), there might be a need for additional or even a separate service 
for preprocessing the query. 