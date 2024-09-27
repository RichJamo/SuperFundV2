// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Treasury {
    address public governance;

    constructor(address _governance) {
        governance = _governance;
    }

    modifier onlyGovernance() {
        require(msg.sender == governance, "Not authorized");
        _;
    }

    function setGovernance(address _governance) external onlyGovernance {
        require(_governance != address(0), "Invalid governance address");
        governance = _governance;
    }

    // Ether deposit function
    function depositEther() external payable {}

    // ERC-20 token deposit function (requires prior approval from sender)
    function depositERC20(address _token, uint256 _amount) external {
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
    }

    // Ether withdrawal function
    function withdrawEther(
        uint256 _amount,
        address _to
    ) external onlyGovernance {
        require(address(this).balance >= _amount, "Insufficient Ether balance");
        payable(_to).transfer(_amount);
    }

    // ERC-20 token withdrawal function
    function withdrawERC20(
        address _token,
        uint256 _amount,
        address _to
    ) external onlyGovernance {
        require(
            IERC20(_token).balanceOf(address(this)) >= _amount,
            "Insufficient token balance"
        );
        IERC20(_token).transfer(_to, _amount);
    }

    // Returns Ether balance of the contract
    function etherBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // Returns ERC-20 token balance of the contract
    function erc20Balance(address _token) public view returns (uint256) {
        return IERC20(_token).balanceOf(address(this));
    }
}
