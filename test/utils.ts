import {
  time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { ethers } from "hardhat";

import { LINEAR_VESTING_TYPE, STAGED_VESTING_TYPE, DAILY_LINEAR_TYPE, QUARTERLY_LINEAR_TYPE, UNVESTED_STATUS } from "./Voucher";

// utilities helper functions
export function accessControlErrorRegex(){
  return /^AccessControl: account 0x[0-9a-zA-Z]{40} is missing role 0x[0-9a-zA-Z]{64}/;
}

export function getRandomInt(max: number ) {
  return Math.floor(Math.random() * max);
}

export function getRandomIntInclusive(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
}

export async function mockVestingSchedules(numberSchedules: number) : Promise<any[]> {
  const amount = "100000";
  const startTimestamp = await time.latest();
  const endTimestamp = startTimestamp + 365 * 24 * 3600;

  let schedules : any[] = [];
  for (let j=0; j<numberSchedules; j++){
    const vestingType = getRandomIntInclusive(LINEAR_VESTING_TYPE, STAGED_VESTING_TYPE);
    const linearType = getRandomIntInclusive(DAILY_LINEAR_TYPE, QUARTERLY_LINEAR_TYPE);

    schedules.push({
        amount: ethers.parseEther(amount),
        vestingType,
        linearType: vestingType == LINEAR_VESTING_TYPE ? linearType : 0,
        startTimestamp: ethers.getBigInt(startTimestamp),
        endTimestamp: vestingType == LINEAR_VESTING_TYPE ? ethers.getBigInt(endTimestamp) : 0,
        isVested: UNVESTED_STATUS,
        remainingAmount: vestingType == LINEAR_VESTING_TYPE ? ethers.parseEther(amount) : 0,
      })
  }

  return schedules;
}