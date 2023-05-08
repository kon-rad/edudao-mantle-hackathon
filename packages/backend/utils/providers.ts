import { Wallet, providers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const sigProviders: any = {
    "1337" : new Wallet(process.env.LOCALHOST_PK!,new providers.JsonRpcProvider(process.env.LOCALHOST_RPC!))
};
  
const Providers : any = {
    "1337" : new providers.JsonRpcProvider(process.env.LOCALHOST_RPC!)
}

export {
    Providers,
    sigProviders
}