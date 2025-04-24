package pl.mproch.geocode;

import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Optional;

import net.postgis.jdbc.jts.JtsGeometry;

// This is first attempt providing additional data to the places from OSM data. We cache all the cities 
// (this is simplification, it includes villages etc.) to be able to augment `addr:` tags with e.g. city information. 
// Currently, the algorithm is very inefficient, as it traverses the cities for each  place we want to augment. 
// Something similar to spatial index might be used here to make it more performant, at this point I wanted to understand 
// how jts library can be used to perform spatial computations on data retrieved from PostGIS.
public record Cities(
    Map<String, List<City>> cities
) {
    
    /*
     * Returns a city (chosen rather randomly...) which contains given location
     */
    Optional<String> cityNameFor(JtsGeometry location) {
        return cities.entrySet().stream().filter(entry -> 
            entry.getValue().stream().anyMatch(other -> other.contains(location))
        ).map(Entry::getKey).findFirst();
    }

    /* 
     * Computes some fake ranking of a place, given its location and name of the city it belongs to.
     * The ranking tries to be based on the population.
     */
    int cityRank(JtsGeometry location, String name) {
        List<City> citiesWithName = cities.get(name);
        if (citiesWithName == null) {
            return 0;
        }
        Optional<Long> population = citiesWithName.stream()
            .filter(other -> other.contains(location))
            .findFirst().flatMap(City::population);
        if (population.isPresent()) {
            return population.get() > 10000 ? 3 : 2;
        } else {
            return 1;
        }
    }
}
