import { GeocodeRequest } from "./data";

export function parseVariant(street: string, city: string): GeocodeRequest {
    const without_prefixes = street.replace("ul.", "").replace("al.", "");
    const street_number = /(.*) +([0-9\/]+)?/i;
    const match = without_prefixes.match(street_number)
    return {
        "city": city.trim(),
        "street": match?.[1]?.trim(),
        "houseNumber":  match?.[2]?.trim()
    }
}

// This is a very first attempt to parse address query, the idea is to be 
// able to detect addresses in both forms:
// `Warszawa, ul. Popularna 8` and `ul. Popularna 8, Warszawa`
// Of course, this is just the beginning. 
export function parseAddress(query: string): GeocodeRequest[] {
    const parts = query.split(",")
    return [parseVariant(parts[0], parts[1]), parseVariant(parts[1], parts[0])]
}