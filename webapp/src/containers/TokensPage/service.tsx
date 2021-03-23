import isEmpty from 'lodash/isEmpty';
import BigNumber from 'bignumber.js';
import { CustomTx } from 'bitcore-lib-dfi';
import RpcClient from '../../utils/rpc-client';
import * as log from '@/utils/electronLogger';
import {
  BLOCKCHAIN_INFO_CHAIN_MAINNET,
  CUSTOM_TX_LEDGER,
  DEFAULT_DFI_FOR_ACCOUNT_TO_ACCOUNT,
  DEFAULT_FEE_RATE,
  DEFAULT_MAXIMUM_AMOUNT,
  DEFAULT_MAXIMUM_COUNT,
  DFI_SYMBOL,
  FEE_RATE,
  LIST_TOKEN_PAGE_SIZE,
  MAINNET,
  MAXIMUM_AMOUNT,
  MAXIMUM_COUNT,
  MINIMUM_DFI_AMOUNT_FOR_MASTERNODE,
  MINIMUM_DFI_REQUIRED_FOR_TOKEN_CREATION,
  UNDEFINED_STRING,
} from '../../constants';
import { handleFetchRegularDFI, sleep } from '../WalletPage/service';
import {
  fetchTokenDataWithPagination,
  getAddressAndAmountListForAccount,
  getHighestAmountAddressForSymbol,
  getBalanceForSymbol,
  getSmallerAmount,
  handleAccountToAccountConversion,
  getAddressForSymbolLedger,
  accountToAccountConversionLedger,
  getKeyIndexAddressLedger,
  utxoLedger,
  createTxWithUseLedger,
} from '@/utils/utility';
import { PaymentRequestLedger } from '@/typings/models';
import { IAddressAndAmount } from '@/utils/interfaces';
import { ipcRendererFunc } from '@/utils/isElectron';
import { construct } from '@/utils/cutxo';
import PersistentStore from '@/utils/persistentStore';
import { TypeWallet } from '@/typings/entities';
export const getAddressInfo = (address) => {
  const rpcClient = new RpcClient();
  return rpcClient.getaddressInfo(address);
};

// TODO: Need to remove the dummy data
export const handleFetchToken = async (id: string) => {
  const rpcClient = new RpcClient();
  const tokens = await rpcClient.tokenInfo(id);
  if (isEmpty(tokens)) {
    return {};
  }
  const transformedData = Object.keys(tokens).map(async (item) => {
    const { collateralAddress } = tokens[item];
    let addressInfo;
    if (collateralAddress && collateralAddress !== UNDEFINED_STRING) {
      addressInfo = await getAddressInfo(collateralAddress);
    }

    return {
      ismine: addressInfo && addressInfo.ismine,
      hash: item,
      ...tokens[item],
    };
  });

  return Promise.resolve(transformedData[0]);
};

export const getTransactionInfo = async (txId): Promise<any> => {
  // const rpcClient = new RpcClient();
  // const txInfo = await rpcClient.getTransaction(txId);
  // if (!txInfo.blockhash && txInfo.confirmations === 0) {
  //   await sleep(3000);
  //   await getTransactionInfo(txId);
  // } else {
  return;
  // }
};

export const handleFetchTokens = async () => {
  const rpcClient = new RpcClient();
  return fetchTokenDataWithPagination(
    0,
    LIST_TOKEN_PAGE_SIZE,
    rpcClient.listTokens
  );
};

export const handleTokenTransfers = async (id: string) => {
  return [];
};

export const createTokenUseWallet = async (tokenData) => {
  let accountToAccountAmount = new BigNumber(0);
  const data = {
    name: tokenData.name,
    symbol: tokenData.symbol,
    isDAT: tokenData.isDAT,
    decimal: new BigNumber(tokenData.decimal).toNumber(),
    limit: new BigNumber(tokenData.limit).toNumber(),
    mintable: JSON.parse(tokenData.mintable),
    tradeable: JSON.parse(tokenData.tradeable),
    collateralAddress: tokenData.collateralAddress ?? tokenData.receiveAddress,
  };
  if (!tokenData.name) {
    delete data.name;
  }
  const rpcClient = new RpcClient();
  const regularDFI = await handleFetchRegularDFI();
  const list = await getAddressAndAmountListForAccount();
  const { address, amount: maxAmount } = await getHighestAmountAddressForSymbol(
    DFI_SYMBOL,
    list
  );
  if (regularDFI.lt(MINIMUM_DFI_REQUIRED_FOR_TOKEN_CREATION)) {
    if (
      new BigNumber(MINIMUM_DFI_REQUIRED_FOR_TOKEN_CREATION).gt(
        new BigNumber(maxAmount).plus(regularDFI)
      )
    ) {
      accountToAccountAmount = await handleAccountToAccountConversion(
        list,
        address,
        DFI_SYMBOL
      );
    }
    const balance = await getBalanceForSymbol(address, DFI_SYMBOL);
    const finalBalance = getSmallerAmount(
      balance,
      accountToAccountAmount.plus(maxAmount).toFixed(8)
    );
    const hash = await rpcClient.accountToUtxos(
      address,
      address,
      `${finalBalance.toFixed(8)}@DFI`
    );
    await getTransactionInfo(hash);
  }

  const hash = await rpcClient.createToken(data);
  return {
    hash,
  };
};

export const createTokenUseLedger = async (
  tokenData,
  paymentsLedger: PaymentRequestLedger[]
) => {
  const { utxo, amountUtxo } = await utxoLedger(
    tokenData.collateralAddress,
    MINIMUM_DFI_REQUIRED_FOR_TOKEN_CREATION
  );

  if (Number(MINIMUM_DFI_REQUIRED_FOR_TOKEN_CREATION) > amountUtxo) {
    throw new Error('The cost is more than the balance of the address');
  } else {
    log.info(`amountUtxo: ${amountUtxo}`);
    const hash = await createTxWithUseLedger(CUSTOM_TX_LEDGER, utxo, {
      txType: CustomTx.customTxType.createToken,
      customData: tokenData,
      address: tokenData.collateralAddress,
    });
    return {
      hash,
    };
  }
  return null;
};

export const handleCreateTokens = async (
  tokenData,
  typeWallet: string | null,
  paymentsLedger: PaymentRequestLedger[]
) => {
  const data = {
    name: tokenData.name,
    symbol: tokenData.symbol,
    isDAT: tokenData.isDAT,
    decimal: Number(tokenData.decimal),
    limit: Number(tokenData.limit),
    mintable: JSON.parse(tokenData.mintable),
    tradeable: JSON.parse(tokenData.tradeable),
    collateralAddress: tokenData.collateralAddress,
  };
  if (!tokenData.name) {
    delete data.name;
  }
  if (typeWallet === 'ledger') {
    return await createTokenUseLedger(data, paymentsLedger);
  }
  return await createTokenUseWallet(data);
};

export const mintTokenWithWallet = async (tokenData) => {
  const rpcClient = new RpcClient();
  const hash = await rpcClient.mintToken(tokenData);
  return {
    hash,
  };
};

export const mintTokenWithLedger = async (tokenData, keyIndex) => {
  const rpcClient = new RpcClient();
  const cutxo = await utxoLedger(tokenData.collateralAddress, 0.01);
  const data = {
    txType: CustomTx.customTxType.mintToken,
    customData: tokenData,
  };
  const ipcRenderer = ipcRendererFunc();
  const res = await ipcRenderer.sendSync(
    CUSTOM_TX_LEDGER,
    cutxo,
    tokenData.address,
    0,
    data,
    keyIndex
  );
  if (res.success) {
    const hash = await rpcClient.sendRawTransaction(res.data.tx);
    return {
      hash,
    };
  } else {
    throw new Error(res.message);
  }
};

export const handleMintTokens = async (
  tokenData,
  networkName = BLOCKCHAIN_INFO_CHAIN_MAINNET
) => {
  const { address } = tokenData;
  const rpcClient = new RpcClient();
  // const txId = await rpcClient.sendToAddress(
  //   address,
  //   DEFAULT_DFI_FOR_ACCOUNT_TO_ACCOUNT,
  //   true
  // );
  // await getTransactionInfo(txId);
  const keyIndex = getKeyIndexAddressLedger(networkName, address);
  if (keyIndex) {
    return await mintTokenWithLedger(tokenData, keyIndex);
  }
  return await mintTokenWithWallet(tokenData);
};

export const updateTokenWithWallet = async (tokenData) => {
  const rpcClient = new RpcClient();
  const hash = await rpcClient.updateToken(tokenData);
  return {
    hash,
  };
};

export const updateTokenWithUseLedger = async (
  tokenData,
  networkName,
  collateralAddress
) => {
  const rpcClient = new RpcClient();
  const cutxo = await utxoLedger(collateralAddress, 0.01);
  const keyIndex =
    getKeyIndexAddressLedger(networkName, collateralAddress) || 0;
  const ipcRenderer = ipcRendererFunc();
  const data = {
    txType: CustomTx.customTxType.updateToken,
    customData: tokenData,
  };
  const res = await ipcRenderer.sendSync(
    CUSTOM_TX_LEDGER,
    cutxo,
    collateralAddress,
    0,
    data,
    keyIndex
  );
  if (res.success) {
    const hash = await rpcClient.sendRawTransaction(res.data.tx);
    return { hash };
  } else {
    throw new Error(res.message);
  }
};

export const updateToken = async (
  tokenData,
  networkName = BLOCKCHAIN_INFO_CHAIN_MAINNET,
  typeWallet: TypeWallet = 'wallet'
) => {
  const data = {
    name: tokenData.name,
    token: tokenData.symbol,
    isDAT: tokenData.isDAT,
    decimal: Number(tokenData.decimal),
    limit: Number(tokenData.limit),
    mintable: JSON.parse(tokenData.mintable),
    tradeable: JSON.parse(tokenData.tradeable),
  };
  if (!tokenData.name) {
    delete data.name;
  }
  if (typeWallet === 'ledger') {
    return await updateTokenWithUseLedger(
      data,
      networkName,
      tokenData.collateralAddress
    );
  }
  return await updateTokenWithWallet(data);
};

export const handleDestroyToken = (tokenId) => {
  const rpcClient = new RpcClient();
  return rpcClient.destroyToken(tokenId);
};

export const getReceivingAddressAndAmountList = async () => {
  const rpcClient = new RpcClient();
  const addressAndAmountList = await rpcClient.getReceivingAddressAndTotalAmountList();
  return {
    addressAndAmountList,
  };
};

export const getReceivingAddressAndAmountListLedger = async (
  payments: PaymentRequestLedger[]
) => {
  const rpcClient = new RpcClient();
  const receivedPromisses = payments.map(({ address }) => {
    // return new Promise(resolve => resolve(5))
    return rpcClient.getReceivedByAddress(address);
  });
  const amounts = await Promise.all(receivedPromisses);
  return {
    addressAndAmountList: payments.map(({ address }, index) => ({
      address,
      amount: amounts[index],
    })),
  };
};
