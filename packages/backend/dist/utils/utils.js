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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiamondFacetsAndFunctions = exports.generateSelectorsData = exports.buildTxPayload = exports.findTopMatches = exports.compileSolidityCode = exports.mergeListIntoDictionary = exports.awaitAndFilter = exports.getTimestamp = void 0;
const ethers_1 = require("ethers");
const abis_1 = require("./abis");
const solc = require("solc");
const mongodb_1 = require("mongodb");
const providers_1 = require("./providers");
function getTimestamp() {
    return Math.floor(+new Date() / 1000);
}
exports.getTimestamp = getTimestamp;
function awaitAndFilter(requests) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = (yield Promise.allSettled(requests))
            .filter((res) => res.status === "fulfilled")
            .map((res) => res.value);
        return result;
    });
}
exports.awaitAndFilter = awaitAndFilter;
function mergeListIntoDictionary(list) {
    const container = {};
    for (let item of list) {
        const keys = Object.keys(item);
        if (keys.length !== 1) {
            console.log(`${JSON.stringify(item)} cannot be merged as one or more elements contain more than 1 keys.`);
            continue;
        }
        const key = keys[0];
        container[key] = item[key];
    }
    return container;
}
exports.mergeListIntoDictionary = mergeListIntoDictionary;
function compileSolidityCode(name, src) {
    let input = {
        language: "Solidity",
        sources: {
            "test.sol": {
                content: src,
            },
        },
        settings: {
            outputSelection: {
                "*": {
                    "*": ["*"],
                },
            },
        },
    };
    var output = JSON.parse(solc.compile(JSON.stringify(input)));
    // `output` here contains the JSON output as specified in the documentation
    // for (var contractName in output.contracts['test.sol']) {
    // console.log(
    //     contractName +
    //     ': ' +
    //     output.contracts['test.sol'][contractName].evm.bytecode.object
    // );
    return output.contracts["test.sol"][name].abi;
}
exports.compileSolidityCode = compileSolidityCode;
function findTopMatches(list, str) {
    let slicedStr = str.toLowerCase().split(" ");
    let mappedList = list.map((item) => {
        return Object.assign({ count: 0 }, item);
    });
    for (let item of mappedList) {
        for (let s of slicedStr) {
            item.count += (item.name.toLowerCase().match(new RegExp(s, "g")) || []).length;
            item.count += (item.description.toLowerCase().match(new RegExp(s, "g")) || []).length;
        }
    }
    mappedList.sort(function (a, b) {
        if (a.count < b.count)
            return 1;
        if (a.count > b.count)
            return -1;
        return 0;
    });
    return mappedList;
}
exports.findTopMatches = findTopMatches;
function getSelectors(abi) {
    const interfaceInstance = new ethers_1.ethers.utils.Interface(abi);
    const signatures = Object.keys(interfaceInstance.functions);
    const selectors = signatures.reduce((acc, val) => {
        if (val !== "init(bytes)") {
            acc.push(interfaceInstance.getSighash(val));
        }
        return acc;
    }, []);
    selectors.interface = interfaceInstance;
    selectors.remove = remove;
    selectors.get = get;
    return selectors;
}
function remove(funcNames) {
    const selectors = this.filter((v) => {
        for (const functionName of funcNames) {
            if (v === this.interface.getSighash(functionName)) {
                return false;
            }
        }
        return true;
    });
    selectors.interface = this.interface;
    selectors.remove = this.remove;
    selectors.get = this.get;
    return selectors;
}
function get(funcNames) {
    const selectors = this.filter((v) => {
        for (const functionName of funcNames) {
            if (v === this.interface.getSighash(functionName)) {
                return true;
            }
        }
        return false;
    });
    selectors.interface = this.interface;
    selectors.remove = this.remove;
    selectors.get = this.get;
    return selectors;
}
function generateSelectorsData(abi, facetAddr, facetName) {
    const selectors = getSelectors(abi);
    const it = (new ethers_1.utils.Interface(abi)).functions;
    const output = [];
    for (let f of Object.keys(it)) {
        output.push({
            selector: selectors[output.length],
            functionName: f,
            facetAddr,
            facetName
        });
    }
    return output;
}
exports.generateSelectorsData = generateSelectorsData;
function buildTxPayload(facetAbi, facetAddress, funcList, action) {
    const data = new ethers_1.ethers.utils.Interface(abis_1.diamondCutABI).encodeFunctionData("diamondCut", [
        [
            {
                facetAddress: action.toLowerCase() == "add" ? facetAddress : ethers_1.ethers.constants.AddressZero,
                action: action.toLowerCase() == "add" ? 0 : 2,
                functionSelectors: funcList
                    ? getSelectors(facetAbi).get(funcList)
                    : getSelectors(facetAbi),
            },
        ],
        ethers_1.ethers.constants.AddressZero,
        "0x",
    ]);
    // const tx = await sigProviders['80001'].sendTransaction({
    //   to : diamondAddr,
    //   data
    // });
    // console.log(tx);
    // await tx.wait();
    return data;
}
exports.buildTxPayload = buildTxPayload;
function parseDiamondCutArgs(data, db) {
    return __awaiter(this, void 0, void 0, function* () {
        let output = {};
        if (data.action == 0) {
            for (let selector of data.functionSelectors) {
                let entityOption = yield db.collection("selectors").findOne({ selector, facetAddr: data.facetAddress });
                let entityOption2 = yield db.collection("selectors").findOne({ selector });
                output = {
                    action: "Add",
                    functionName: entityOption2 ? entityOption2.functionName : selector,
                    facetAddr: entityOption ? entityOption.facetAddr : data.facetAddress
                };
            }
        }
        else if (data.action == 2) {
            for (let selector of data.functionSelectors) {
                let entityOption = yield db.collection("selectors").findOne({ selector, facetAddr: data.facetAddress });
                let entityOption2 = yield db.collection("selectors").findOne({ selector });
                output = {
                    action: "Remove",
                    functionName: entityOption2 ? entityOption2.functionName : selector,
                    facetAddr: entityOption ? entityOption.facetAddr : data.facetAddress
                };
            }
        }
        else {
            for (let selector of data.functionSelectors) {
                let entityOption = yield db.collection("selectors").findOne({ selector, facetAddr: data.facetAddress });
                let entityOption2 = yield db.collection("selectors").findOne({ selector });
                output = {
                    action: "Replace",
                    functionName: entityOption2 ? entityOption2.functionName : selector,
                    facetAddr: entityOption ? entityOption.facetAddr : data.facetAddress
                };
            }
        }
        return output;
    });
}
// async function getDiamondLogs(diamondAddr : any, provider : providers.JsonRpcProvider) {
//     const client = await MongoClient.connect(process.env.DATABASE_URL!,{})
//     const db = client.db("facets");     
//     const currBlockNum = await provider.getBlockNumber();
//     const res = await fetch(`https://api-testnet.polygonscan.com/api?module=account&action=txlist&address=${diamondAddr}&startblock=${START_BLOCK}&endblock=${currBlockNum}&page=1&offset=10&sort=asc&apikey=YourApiKeyToken`);
//     const data = (await res.json()).result;
//     let selector = getSelectors(diamondCutABI)[0];
//     // console.log(selector, data);
//     // console.log(selectors)
//     let result = data.filter((item : any) => {
//         return item.input.slice(0,10).toLowerCase() ==  selector.toLowerCase()
//     })
//     let it = new utils.Interface(diamondCutABI);
//     let output : any = [];
//     for(let tx of result) {
//         let receipt = await provider.getTransactionReceipt(tx.hash);
//         let logs = receipt.logs.filter((item : any) => {
//             return item.address.toLowerCase() == diamondAddr.toLowerCase()
//         })
//         for (let log of logs) {
//           let info = {
//             timestamp : tx.timeStamp ,
//             ...(await parseDiamondCutArgs(it.parseLog(log).args[0][0],db))
//           }
//           // console.log(it.parseLog(log).args[0][0])
//           output.push(info);
//         }
//     }
//     return output
// }
function matchToFacets(facetAddr, selectorList, db) {
    return __awaiter(this, void 0, void 0, function* () {
        let output = [];
        for (let selector of selectorList) {
            let selectorEntity = yield db.collection("selectors").findOne({ selector, facetAddr });
            if (selectorEntity) {
                output.push(selectorEntity);
            }
            else {
                selectorEntity = yield db.collection("selectors").findOne({ selector });
                if (selectorEntity) {
                    output.push(Object.assign({}, selectorEntity));
                }
                else {
                    output.push({
                        selector
                    });
                }
            }
        }
        return output;
    });
}
function getDiamondFacetsAndFunctions(diamondAddr, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield mongodb_1.MongoClient.connect(process.env.DATABASE_URL, {});
        const db = client.db("facets");
        const cLoupeProxy = new ethers_1.Contract(diamondAddr, abis_1.DiamondLoupeFacetABI, providers_1.Providers[chainId || '80001']);
        const readDiamondFacets = yield cLoupeProxy.facets();
        let output = [];
        console.log(readDiamondFacets);
        for (let facet of readDiamondFacets) {
            let facetEntity = yield db.collection("facets").findOne({ address: facet.facetAddress });
            output.push({
                facetAddr: facet.facetAddress,
                facetName: facetEntity ? facetEntity.name : "noName",
                functions: (yield matchToFacets(facet.facetAddress, facet.functionSelectors, db))
            });
        }
        return output;
    });
}
exports.getDiamondFacetsAndFunctions = getDiamondFacetsAndFunctions;
const abi = [
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_flatFee",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "_percentFee",
                "type": "uint256"
            }
        ],
        "name": "vote",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    }
];
