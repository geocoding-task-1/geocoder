export interface Area {
    osmId: number,
    name: string,
    adminLevel: number
}

export interface Point {
    longitude: number,
    latitude: number
}

export interface Street {
    osmId: number,
    name: number
    distance: number
}

export interface House {
    osmId: number,
    number: number
    street: string,
    zipCode: string
}

// The areas containing given point, streets and houses are ordered
// by the distance from the point. 
export interface ReverseGeocodeResult {
    areas: Area[],
    streets: Street[]
    houses: House[]
}

export interface GeocodeRequest {
    city?: string,
    zipCode?: string,
    street?: string,
    houseNumber?: string
}

// One of the found results for the address 
// (we include the house, street, etc.) to check
// if the address was decoded correctly
export interface GeocodeResult {
    osmId: number,
    houseNumber: string
    street: string,
    city: string
    zipCode: string,
    position: Point,
    rank: number
}
