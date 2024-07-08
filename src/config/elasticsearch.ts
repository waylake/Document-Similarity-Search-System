import { Client } from "@elastic/elasticsearch";
import { envConfig } from "./envConfig";

export const esClient = new Client({ node: envConfig.ELASTICSEARCH_NODE });
