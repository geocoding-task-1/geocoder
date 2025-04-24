import { parseAddress } from "./address_parser";

test("address parsing", () => {
    expect(parseAddress("Warszawa, Popularna 8/10")).toContainEqual(
        {
            "city": "Warszawa",
            "houseNumber": "8/10",
            "street": "Popularna",
        }
    );
    expect(parseAddress("ul. Popularna 8/10, Warszawa")).toContainEqual(
        {
            "city": "Warszawa",
            "houseNumber": "8/10",
            "street": "Popularna",
        }
    );

    expect(parseAddress("ul. Wielka 11, Minsk Mazowiecki")).toContainEqual(
        {
            "city": "Minsk Mazowiecki", 
            "houseNumber": "11", 
            "street": "Wielka"
        }
    );
  
  
});