package pl.mproch.geocode;

public class Indexer {

    public static void main(String[] args) throws Exception {
        // Some more production ready configuration system should be used here. 
        String host = System.getenv("PGHOST");
        String user = System.getenv("PGUSER");
        String password = System.getenv("PGPASSWORD");


        var places = new Places(host, user, password);
        places.initialise();
        places.index();
    }
}
