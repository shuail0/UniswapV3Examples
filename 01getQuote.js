const { Token } = require('@uniswap/sdk-core');
const { computePoolAddress } = require('@uniswap/v3-sdk');
const { ethers } = require('ethers');
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');
const Quoter = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');

const ethrpc = 'http://localhost:8545';
const ethereumProvider = new ethers.getDefaultProvider(ethrpc);

; (async ()=>{
    const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
    const QUOTER_CONTRACT_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
    const poolFee = 3000;

    // 获得chainID
    const chainId = (await ethereumProvider.getNetwork()).chainId;

    const WETH_TOKEN = new Token(
        chainId,  // chainID，主网的chainid是1
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',  // token地址
        18,  // 精度
        'WETH', // symbol
        'Wrapped Ether' // 名字
    );


    const USDC_TOKEN = new Token(
        chainId,
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        6,
        'USDC',
        'USD//C'
    );


    // 步骤一：计算流动性池地址
    const currentPoolAddress = computePoolAddress({
        factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
        tokenA: WETH_TOKEN,
        tokenB: USDC_TOKEN,
        fee: poolFee
    });

    console.log(currentPoolAddress)

    // 步骤二：从池子中获取数据

    // // // 创建池对象
    const poolContract = new ethers.Contract(currentPoolAddress, IUniswapV3PoolABI['abi'], ethereumProvider);

    // // 从合约获取矿池数据
    const [token0, token1, fee] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee()
    ])
    console.log(token0, token1, fee)

    // // // 步骤三： 获取报价
    // // // 连接报价合约
    const quoterContract = new ethers.Contract(QUOTER_CONTRACT_ADDRESS, Quoter.abi, ethereumProvider);
    const approveAmount = ethers.utils.parseUnits('1000000', 6);  // 定义1000 USDC的数量
    await tokenApprove(wallet, USDC_TOKEN.address, V3_SWAP_ROUTER_ADDRESS, approveAmount);
    await tokenApprove(wallet, USDC_TOKEN.address, V3_SWAP_ROUTER_ADDRESS, approveAmount);


    // // 获取返回数量 - 获取报价
    const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
        USDC_TOKEN.address,
        WETH_TOKEN.address,  // wETH地址
        poolFee,
        fromReadableAmount(
            1000, // 交易数量
            6 // 代币精度
        ).toString(),
        0
    );
    console.log('quotedAmountOut:', quotedAmountOut.toString())
})();


// token单位转换函数，根据token的数量和精度，转换为bignumber类型的数据并返回
function fromReadableAmount(
    amount,
    decimals
  ){
    return ethers.utils.parseUnits(amount.toString(), decimals)
  }