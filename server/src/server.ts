import express from 'express'
import { query, validationResult } from 'express-validator'
import {Express, Request, Response} from 'express-serve-static-core'
import promClient from 'prom-client'
import promBundle from 'express-prom-bundle'
import { GeoService } from './geo_service'
import { Database } from './db'


export async function createServer(): Promise<Express> {
  const server = express()

  const database = new Database();
  const geoService = new GeoService(database)

  const metricsMiddleware = promBundle({includeMethod: true, includePath: true});

  server.use(metricsMiddleware);

  server.get<{},{}, {},{ lon: string, lat: string}, {}>('/reverse-geocode', 
    query('lon').isFloat(), 
    query('lat').isFloat(), 
    async (req, res) => {
      const result = validationResult(req);
      if (!result.isEmpty()) {
        res.status(400).send({ errors: result.array() });
        return
      }
      const areas = await geoService.reverseGeocode({ longitude: parseFloat(req.query.lon), latitude: parseFloat(req.query.lat) })
      res.json(areas)
    }
  )
  server.get<{},{}, {},{ city?: string, zipCode?: string, houseNumber?: string, street?: string}, {}>('/geocode', async (req, res) => {
    const points = await geoService.geocode(req.query)
    res.json(points)
  })
  server.get<{},{}, {},{ query: string}, {}>('/geocode-query', query('query').notEmpty(), async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      res.status(400).send({ errors: result.array() });
      return
    }
    const points = await geoService.geocodeWithQuery(req.query.query ?? '')
    res.json(points)
  })
  // This one should be on a different port
  server.get('/metrics', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
  });
  return server
}


const register = new promClient.Registry();
