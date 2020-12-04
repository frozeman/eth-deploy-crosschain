const { signTransaction, recoverTransaction, calcContractAddress } = require('./signTx.js');
const { defaultAbiCoder } = require('ethers/lib/utils')


const encodeParams = (dataTypes, data) => {
    return defaultAbiCoder.encode(dataTypes, data)
}

const buildBytecode = (
    constructorTypes,
    constructorArgs,
    contractBytecode,
) => {
    return `${contractBytecode}${encodeParams(constructorTypes, constructorArgs).slice(
        2,
    )}`
}

exports.generateCrossChainTransaction = (bytecode, options) => {
    let replaceablePrivateKey = '0x77d9e09cae3006158d1c6f4059e2ff61ca1e110b1c02094baad56ce7381e5f94';
    let signatureReplacement = '1234123412341234123412341234123412341234123412341234123412341234';

    if(!options)
        options = {};

    // add constructor arguments, if given
    if(options.constructorArgs && options.constructorArgs.types && options.constructorArgs.params) {
        bytecode = buildBytecode(options.constructorArgs.types, options.constructorArgs.params, bytecode);
    }


    let signedTx = signTransaction({
        data: bytecode,
        nonce: 0,
        value: options.value || 0, // default,
        gas: options.gas || 4000000, // default,
        gasPrice: options.gasPrice || '200000000000' // default
    }, replaceablePrivateKey)

    // change signature
    let r = 'a0' + signedTx.r.replace('0x', '')
    let s = 'a0' + signedTx.s.replace('0x', '')
    let v = signedTx.v.replace('0x', '')

    let rawTx = signedTx.rawTransaction.replace(r, '').replace(s, '') // remove r, s
    rawTx = rawTx.substr(0, rawTx.length - v.length) + '1b' // replace v with 27 (1b)
    rawTx = rawTx + 'a0' + signatureReplacement + 'a0' + signatureReplacement // add new r, s

    let deployerAddress = recoverTransaction(rawTx);

    return {
        deployerAddress: deployerAddress,
        contractAddress: calcContractAddress(deployerAddress),
        rawTransaction: rawTx
    }
}
