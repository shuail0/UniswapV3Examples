const JSBI = require('jsbi');
const { Token, Percent, TradeType } = require('@uniswap/sdk-core');
const { computePoolAddress } = require('@uniswap/v3-sdk');
const { ethers } = require('ethers');
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json');
const Quoter = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json');
const { AlphaRouter, SwapType, CurrencyAmount } = require('@uniswap/smart-order-router');
const v3SwapRouterABI = require('./abis/v3SwapRouter.json')
const v3SwapRouterABI2 = require('@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json').abi

// token单位转换函数
function fromReadableAmount(amount, decimals) {
    const extraDigits = Math.pow(10, countDecimals(amount))
    const adjustedAmount = amount * extraDigits
    return JSBI.divide(
      JSBI.multiply(
        JSBI.BigInt(adjustedAmount),
        JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals))
      ),
      JSBI.BigInt(extraDigits)
    )
  }

function countDecimals(x) {
    if (Math.floor(x) === x) {
        return 0
    }
    return x.toString().split('.')[1].length || 0
    }

const ERC20_ABI = [
    // Read-Only Functions
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    
    // Authenticated Functions
    'function transfer(address to, uint amount) returns (bool)',
    'function approve(address _spender, uint256 _value) returns (bool)',
    
    // Events
    'event Transfer(address indexed from, address indexed to, uint amount)',
    ]
// 授权
const tokenApprove = async (wallet, tokenAddr, spender, approveValue) => {
    const tokenContract = new ethers.Contract(tokenAddr, ERC20_ABI, wallet)
    const txApprove = await tokenContract.approve(spender, approveValue);
    return await txApprove.wait();
};



// ==============程序从这里开始=========

const localhost = 'http://localhost:8545';
const mainrpc = 'https://eth-mainnet.g.alchemy.com/v2/qRnk4QbaEmXJEs5DMnhitC0dSow-qATl';
const proviteKey = '0x93b422171e6a1bf30ead5913591624c421b45345418b76ee4f943ea45a580bf0';
const localProvieder = new ethers.getDefaultProvider(localhost);
const mainProvider = new ethers.getDefaultProvider(mainrpc);
const wallet = new ethers.Wallet(proviteKey, localProvieder);


; (async ()=>{


    // 步骤0: 配置参数
    const V3_SWAP_ROUTER_ADDRESS = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'

    // 获得chainID
    // const chainId = (await ethereumProvider.getNetwork()).chainId;
    const WETH_TOKEN = new Token(
        1,  // chainID，主网的chainid是1, 这里直接写死
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',  // token地址
        18,  // 精度
        'WETH', // symbol
        'Wrapped Ether' // 名字
    );


    const USDC_TOKEN = new Token(
        1,
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        6,
        'USDC',
        'USD//C'
    );

    const DAI_TOKEN = new Token(
        1,
        '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        18,
        'DAI',
        'Dai Stablecoin'
      )


    // 步骤一：创建路由
    // // 创建router路由
    const router = new AlphaRouter({
        chainId: 1,
        provider: mainProvider
    })

    // // 步骤二：交易设置
    const options = {
        recipient: wallet.address,  // 接收地址
        slippageTolerance: new Percent(50, 10_000),  // 滑点容忍度
        deadline: Math.floor(Date.now() / 1000 + 1800), // 交易截止时间， 这里是加了30分钟
        type: SwapType.SWAP_ROUTER_02
    }

    // 方法一： 使用SDK构建合callData进行交易，这种先使用SDK提供的方法获得callData，再使用钱包进行交易，这种方法可以连接外部钱包的时候使用。
    // 方法二： 直接调用合约方法，这种方法代码简洁明了，但无法使用外部钱包调用
    // 方法三： 使用

    // 步骤三：交易
    // =====================用原生ETH兑换为USDC=====================
    //     // 获取交易路线
    // const route = await router.route(
    //     CurrencyAmount.fromRawAmount(WETH_TOKEN, fromReadableAmount(1, 18).toString()),  // 要支付的代币和数量
    //     USDC_TOKEN,  // 将要收到的币
    //     TradeType.EXACT_INPUT,
    //     options
    // )
    // // console.log('route: ', route)

    // // 提交
    // const tx = await wallet.sendTransaction({
    //     data: route.methodParameters.calldata,
    //     to: V3_SWAP_ROUTER_ADDRESS,
    //     value: '0x' + fromReadableAmount(10, 18).toString(16),  // 如果支付的是原生ETH，这里需要传入16进制的ETH数量
    //     gasLimit: ethers.utils.hexlify(300000),  // Estimate accordingly
    //     gasPrice: ethers.utils.parseUnits('20', 'gwei'),  // Or use other gas strategies

    // })
    // console.log(tx)
    // =======================================================

    // // // =====================用USDC兑换DAI=====================

    // 创建路由
    const v3SwapRouterContract =  new ethers.Contract(V3_SWAP_ROUTER_ADDRESS, v3SwapRouterABI, wallet);
    
    // // 授权使用交易
    // const approveAmount = ethers.utils.parseUnits('100', 6);  // 定义1000 USDC的数量
    // await tokenApprove(wallet, USDC_TOKEN.address, V3_SWAP_ROUTER_ADDRESS, approveAmount);

    // // // 构建参数
    // const swapParams = {
    //     tokenIn:USDC_TOKEN.address, // 支付代币
    //     tokenOut:DAI_TOKEN.address,  // 返回代币
    //     fee: 500,  // 交易手续费
    //     recipient: wallet.address,  // 接收地址
    //     deadline: Math.floor(Date.now() / 1000) + 60 * 20,
    //     amountIn: fromReadableAmount(100, 6).toString(),
    //     amountOutMinimum: 0,
    //     sqrtPriceLimitX96: 0
    // };


    // const tx = await v3SwapRouterContract.exactInputSingle(swapParams)
    // const receipt = await tx.wait()
    // console.log(receipt)


    // // // =====================用USDC兑换为wTH=====================
    const v3SwapRouter2 = new ethers.Contract(V3_SWAP_ROUTER_ADDRESS, v3SwapRouterABI2, wallet)


    // // // // 创建交易路线

        // 授权使用交易
    const approveAmount = ethers.utils.parseUnits('100000000000000000000000', 6);  // 定义1000 USDC的数量
    await tokenApprove(wallet, USDC_TOKEN.address, V3_SWAP_ROUTER_ADDRESS, approveAmount);

    // 方法1: 用SDK的智能路由获得编码后的数据(calldata)
    //     // 获取交易路线
    const route = await router.route(
        CurrencyAmount.fromRawAmount(USDC_TOKEN, fromReadableAmount(100, 6).toString()),  // 要支付的代币和数量
        WETH_TOKEN,  // 将要收到的币
        TradeType.EXACT_INPUT,
        {
            recipient: '0x0000000000000000000000000000000000000002',  // 接收地址, 因为要将wETH转换为ETH，接收地址为：0x0000000000000000000000000000000000000002
            slippageTolerance: new Percent(50, 10_000),  // 滑点容忍度
            deadline: Math.floor(Date.now() / 1000 + 1800), // 交易截止时间， 这里是加了30分钟
            type: SwapType.SWAP_ROUTER_02
        }
    )

    const usdcToETHcallData = route.methodParameters.calldata; // 取出calldata
    console.log('usdcToETHcallData: ', usdcToETHcallData)
        

    // 方法2: 用.interface.encodeFunctionData 自行编码calldata
    // const usdcToETHcallData = v3SwapRouterContract.interface.encodeFunctionData('exactInputSingle', [{
    //     tokenIn: USDC_TOKEN.address,  // 支付代币地址
    //     tokenOut: WETH_TOKEN.address,  // 想要获得的代币地址
    //     fee: 500, // 交易手续费
    //     recipient: '0x0000000000000000000000000000000000000002',   // 接收地址, 因为要将wETH转换为ETH，接收地址为：0x0000000000000000000000000000000000000002
    //     deadline: Math.floor(Date.now() / 1000) + 60 * 20,  // 交易截止时间
    //     amountIn: fromReadableAmount(100, 6).toString(),  // 支付数量，这里是1000 USDC
    //     amountOutMinimum: 0,  // 最小获得 wETH 数量
    //     sqrtPriceLimitX96: 0
    // }])

    // console.log('usdcToETHallData:', usdcToETHcallData)


    const unwrapData = v3SwapRouterContract.interface.encodeFunctionData('unwrapWETH9', [0, wallet.address]);

    // console.log(unwrapData)

    const tx = await v3SwapRouterContract.multicall([usdcToETHcallData, unwrapData]);
    const response = await tx.wait()
    console.log(response)

})();

