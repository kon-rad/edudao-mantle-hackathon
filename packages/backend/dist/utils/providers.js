"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sigProviders = exports.Providers = void 0;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sigProviders = {
    "1337": new ethers_1.Wallet(process.env.LOCALHOST_PK, new ethers_1.providers.JsonRpcProvider(process.env.LOCALHOST_RPC))
};
exports.sigProviders = sigProviders;
const Providers = {
    "1337": new ethers_1.providers.JsonRpcProvider(process.env.LOCALHOST_RPC)
};
exports.Providers = Providers;
