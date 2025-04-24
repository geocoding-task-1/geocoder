import { parseAddress } from "./address_parser";
import { GeocodeRequest, GeocodeResult, Point, ReverseGeocodeResult } from "./data";
import { Database } from "./db"

export class GeoService {
    database: Database

    constructor(database: Database) {
        this.database = database
    }

    async reverseGeocode(point: Point): Promise<ReverseGeocodeResult> {
        const areas = await this.database.getAreas(point);
        const area = areas[0]
        const streets = areas.length > 0 ? await this.database.getStreetsForArea(point, area) : []
        const houses = streets.length > 0 ? await this.database.getHousesForStreets(point, area, streets) : []
        return {
            areas: areas,
            streets: streets,
            houses: houses
        }
    }

    async geocodeWithQuery(query: string): Promise<GeocodeResult[]> {
        return (await Promise.all(parseAddress(query).map(variant => this.geocode(variant)))).flat().sort((a,b) => a.rank - b.rank)
    }

    async geocode(candidate: GeocodeRequest): Promise<GeocodeResult[]> {
        const places = await this.database.getPlacesFor(candidate)
        return places.sort((a,b) => a.rank - b.rank)
    }


}
