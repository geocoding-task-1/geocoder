import postgres, { Sql } from 'postgres'
import { Area, GeocodeRequest, GeocodeResult, House, Point, Street } from './data'

export class Database {
  sql: Sql<{}>

  constructor() {
    this.sql = postgres({ transform: postgres.camel }) // will use psql environment variables
  }


  // It might be better to change the reference system on import.
  private tf(point: Point): any {
    return this.sql`ST_TRANSFORM(ST_Point( ${ point.longitude }, ${ point.latitude }, 4326), 3857)`
  }

  async getAreas(point: Point): Promise<Area[]> {
      const areas = await this.sql<Area[]>`
        select osm_id, name, cast(admin_level as integer) from planet_osm_polygon area 
        where boundary = 'administrative' and ST_Contains(area.way, ${ this.tf(point) })
        order by cast(admin_level as integer) desc
      `
      return areas
  }


  async getStreetsForArea(point: Point, area: Area): Promise<Street[]> {
    const streets = await this.sql<Street[]>`
      select * from (
        select street.osm_id, street.name, ST_Distance(${ this.tf(point) }, street.way) as distance from 
        planet_osm_line street, planet_osm_polygon area where 
        area.osm_id = ${ area.osmId } and ST_intersects(area.way, street.way) and street.highway is not null and street.name is not null
      ) order by distance limit 10
    `   
    return streets
  }


  async getHousesForStreets(point: Point, area: Area, streets: Street[]): Promise<House[]> {
    const houses_points = this.sql<House[]>`
      select * from (
        select 
          house.osm_id, 
          house."addr:housenumber" as number, 
          house."addr:street" as street,
          house."addr:postcode" as zip_code,
          ST_Distance(${ this.tf(point) }, house.way) as distance 
        from planet_osm_point house, planet_osm_polygon area where 
          house."addr:street" in ${ this.sql(streets.map(str => str.name)) }
          and area.osm_id = ${ area.osmId } and ST_intersects(area.way, house.way)
      ) order by distance limit 10
      `   
    const houses_areas = this.sql<House[]>`
      select * from (
        select 
          house.osm_id, 
          house."addr:housenumber" as number, 
          house."addr:street" as street,
          house."addr:postcode" as zip_code,
          ST_Distance(${ this.tf(point) }, house.way) as distance 
        from planet_osm_polygon house, planet_osm_polygon area where 
          house."addr:street" in ${ this.sql(streets.map(str => str.name)) }
          and area.osm_id = ${ area.osmId } and ST_intersects(area.way, house.way)
      ) order by distance limit 10
    `
    return [...await houses_points, ...await houses_areas]
  }

  private match_part(name: string, value?: string): any {
    return value ? this.sql`and soundex(${value.toLowerCase()}) = soundex(${this.sql(name)}) and levenshtein(${value.toLowerCase()}, ${this.sql(name)}) < 2` : this.sql``
  }

  private string_distance(name: string, value?: string): any {
    return value ? this.sql`levenshtein(${ value }, ${this.sql(name)})` : this.sql`0`
  }

  private lon(column: string): any {
    return this.sql`
      ST_X (ST_Transform (${this.sql(column)}, 4326)) AS longitude
    `
  }

  private lat(column: string): any {
    return this.sql`
      ST_Y (ST_Transform (${this.sql(column)}, 4326)) AS latitude
    `
  }

  async getPlacesFor(geocode: GeocodeRequest): Promise<GeocodeResult[]> {
    const candidates = await this.sql<PlaceFound[]>`
      select osm_id, city, zip_code, house_number, street,
      ${this.string_distance("city", geocode.city)} as city_distance,
      ${this.string_distance("street", geocode.street, )} as street_distance,
      ${this.string_distance("houseNumber", geocode.houseNumber)} as house_distance,
      ${this.lon("centre")},
      ${this.lat("centre")},
      rank
      from places where true 
      ${this.match_part("city", geocode.city)}
      ${this.match_part("houseNumber", geocode.houseNumber)}
      ${this.match_part("street", geocode.street)}
      order by rank desc limit 10
    `
    return candidates.map(this.convertPlaceFound)
  }

  private convertPlaceFound(found: PlaceFound): GeocodeResult {
    const { cityDistance, houseDistance, streetDistance, longitude, latitude, rank, ...result} = found;
    // Example, fake algorithm of assigning ranking to a location found by geocoding algorithm
    const finalRank = 10 * rank - (cityDistance + houseDistance + streetDistance);
    return {
      ...result,
      position: { longitude, latitude},
      rank: finalRank
    }
  }

}

interface PlaceFound {
  osmId: number,
  city: string,
  zipCode: string,
  latitude: number, 
  longitude: number, 
  street: string,
  houseNumber: string
  cityDistance: number,
  streetDistance: number,
  houseDistance: number,
  rank: number,
}