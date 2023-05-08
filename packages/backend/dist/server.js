"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const morgan_body_1 = __importDefault(require("morgan-body"));
const body_parser_1 = __importDefault(require("body-parser"));
const mongodb_1 = require("mongodb");
const utils_1 = require("./utils/utils");
const cors = require("cors");
var cron = require("node-cron");
dotenv_1.default.config();
const corsOptions = {
    origin: "http://localhost:3000",
    optionsSuccessStatus: 200,
};
const app = (0, express_1.default)();
const port = process.env.PORT || 9000;
// parse JSON and others
app.use(cors());
app.use(express_1.default.json());
app.use(body_parser_1.default.json());
// log all requests and responses
(0, morgan_body_1.default)(app, { logAllReqHeader: true, maxBodyLength: 5000 });
//connect to db
let cachedClient = null;
let cachedDb = null;
const connectToDb = () => __awaiter(void 0, void 0, void 0, function* () {
    if (cachedDb)
        return cachedDb;
    const client = yield mongodb_1.MongoClient.connect(process.env.DATABASE_URL, {});
    const db = client.db("facets");
    cachedDb = db;
    cachedClient = client;
    return db;
});
app.post("/get-diamond-info", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { address, chainId } = req.body;
        const db = yield connectToDb();
        // const history = await getDiamondLogs(address, chainId ? Providers[chainId] : Providers["80001"]);
        const facets = yield (0, utils_1.getDiamondFacetsAndFunctions)(address, chainId);
        res.status(200).send({
            facets
            // history
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).end();
    }
}));
app.post("/add-facet", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, abi, address, description } = req.body;
        const selectorsData = (0, utils_1.generateSelectorsData)(JSON.parse(abi), address, name);
        const timesUsed = 0;
        const audited = false;
        const db = yield connectToDb();
        const exist = yield db.collection("facets").findOne({ address: { $regex: new RegExp("^" + address.toLowerCase(), "i") } });
        if (!exist) {
            db.collection("facets").insertOne({ name, address, description, abi, timesUsed, audited });
            db.collection("selectors").insertMany(selectorsData);
        }
        res.status(200).end();
    }
    catch (e) {
        console.error(e);
        res.status(500).end();
    }
}));
app.get("/facets", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { searchStr, size } = req.body;
        const db = yield connectToDb();
        let facets = yield db.collection("facets").find({}).toArray();
        if (searchStr && searchStr != "") {
            facets = (0, utils_1.findTopMatches)(facets, searchStr);
        }
        if (size) {
            facets = facets.slice(0, size);
        }
        res.status(200).send({
            facets
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).send();
    }
}));
app.post("/get-facet-selectors", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { facetAddr } = req.body;
        const db = yield connectToDb();
        const selectors = yield db.collection("selectors").find({ facetAddr }).toArray();
        res.status(200).send({
            selectors
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).end();
    }
}));
app.post("/update-diamond", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { facetAddr, diamondAddr, action, funcList } = req.body;
        const db = yield connectToDb();
        // const facet = await db.collection("facets").findOne({"_id" : new ObjectId(facetId)})
        const facet = yield db.collection("facets").findOne({ "address": facetAddr });
        if (facet && action.toLowerCase() == "add") {
            yield db.collection("facets").findOneAndUpdate({ "address": facetAddr }, { $set: { "timesUsed": (facet.timesUsed + 1) } }, { new: true });
        }
        // const payload = await buildTxPayload(facet.abi,facet.address,funcList,action,diamondAddr,Providers["80001"]);
        const payload = (0, utils_1.buildTxPayload)(facet.abi, facet.address, funcList, action);
        res.status(200).send({
            payload
        });
    }
    catch (e) {
        console.log(e);
        res.status(500).end();
    }
}));
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at https://localhost:${port}`);
});
