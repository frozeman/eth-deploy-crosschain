const Transaction = require('ethereumjs-tx').Transaction;
const { keccak256 } = require('ethers/lib/utils');
const RLP = require('eth-lib/lib/rlp');// jshint ignore:line
const Account = require('eth-lib/lib/account');
const Bytes = require('eth-lib/lib/bytes');// jshint ignore:line
const Hash = require('eth-lib/lib/hash');
const _txInputFormatter = function (options) {

    if (options.data && options.input) {
        throw new Error('You can\'t have "data" and "input" as properties of transactions at the same time, please use either "data" or "input" instead.');
    }

    if (!options.data && options.input) {
        options.data = options.input;
        delete options.input;
    }

    if (options.data && !options.data.startsWith('0x')) {
        options.data = '0x' + options.data;
    }

    // allow both
    if (options.gas || options.gasLimit) {
        options.gas = options.gas || options.gasLimit;
    }

    ['gasPrice', 'gas', 'value', 'nonce'].filter(function (key) {
        return options[key] !== undefined;
    }).forEach(function (key) {
        options[key] = '0x'+ Number(options[key]).toString(16);
    });

    return options;
};

module.exports = {
    calcContractAddress: function (sender){
        return Account.toChecksum("0x" + keccak256(RLP.encode([sender, '0x'])).slice(12).substring(14));
    },
    recoverTransaction: function recoverTransaction(rawTx) {
        var values = RLP.decode(rawTx);
        var signature = Account.encodeSignature(values.slice(6, 9));
        var recovery = Bytes.toNumber(values[6]);
        var extraData = recovery < 35 ? [] : [Bytes.fromNumber((recovery - 35) >> 1), '0x', '0x'];
        var signingData = values.slice(0, 6).concat(extraData);
        var signingDataHex = RLP.encode(signingData);
        return Account.recover(Hash.keccak256(signingDataHex), signature);
    },
    signTransaction: function signTransaction(tx, privateKey) {
        let transactionOptions = {};

        privateKey = privateKey.replace('0x','');

        if (!tx) {
            throw new Error('No transaction object given!');
        }

        function signed(tx) {

            try {
                let transaction = _txInputFormatter(tx);
                transaction.to = transaction.to || '0x';
                transaction.data = transaction.data || '0x';
                transaction.value = transaction.value ? '0x'+ Number(transaction.value).toString(16) : '0x';
                transaction.gasLimit = transaction.gas;

                var ethTx = new Transaction(transaction, transactionOptions);

                ethTx.sign(Buffer.from(privateKey, 'hex'));

                var validationResult = ethTx.validate(true);

                if (validationResult !== '') {
                    throw new Error('Signer Error: ' + validationResult);
                }

                var rlpEncoded = ethTx.serialize().toString('hex');
                var rawTransaction = '0x' + rlpEncoded;
                var transactionHash = keccak256(rawTransaction);

                var result = {
                    messageHash: '0x' + Buffer.from(ethTx.hash(false)).toString('hex'),
                    v: '0x' + Buffer.from(ethTx.v).toString('hex'),
                    r: '0x' + Buffer.from(ethTx.r).toString('hex'),
                    s: '0x' + Buffer.from(ethTx.s).toString('hex'),
                    rawTransaction: rawTransaction,
                    transactionHash: transactionHash
                };

                return result;

            } catch (e) {
                throw new Error(e);
            }
        }

        // Otherwise, get the missing info from the Ethereum Node
        return signed(tx);
    }
};
