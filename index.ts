import { Axios } from "axios";
import { config as loadDotEnv } from "dotenv";

loadDotEnv();

const client = new Axios({
  baseURL: "https://wmtippspiel.srf.ch",
});
