package pl.mproch.geocode;

public record Place(
    long osmId,
    String city,
    String street,
    String houseNumber,
    String zipCode,
    Object centre,
    int rank
) {}
