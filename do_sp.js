import { v4 as uuidv4 } from "uuid";
import skuTypes from "./sku_types.js";
import pkgGroupsArr from "./pkg_groups.js";
import { logError, handleRetries } from "./print_sports_2.js";
import getSplitPackaging2 from "./algo.js";
const BASE_URL = process.env.LINNWORKS_BASE_URL;
let orderItemsData = {};

import {
  getOrderByNumIdLimiter,
  getOrderPkgCalcLimiter,
  getInventoryItemLimiter,
  addOrderItemLimiter,
  setOrderPackagingSplitMOLimiter,
  splitOrderLimiter,
} from "./rate_limiter.js";

const getTestD_6ProductData = (orderId, quantity, createdDate) => {
  return {
    orderId,
    itemId: "feb9f143-9974-4b00-bb30-09e51b5ade41",
    channelSKU: ".TestD_6",
    quantity,
    fulfilmentCenter: "3adfb53a-61f1-4c92-9466-9c051f603e48",
    createdDate,
  };
};

async function splitOrder(
  token,
  numId,
  orderId,
  postalServiceId,
  fulfilmentLocationId,
  items,
) {
  const data = {
    orderId,
    newOrders: [
      {
        Items: items,
        PostalServiceId: postalServiceId,
      },
    ],
    type: "Manual Split",
    fulfilmentLocationId,
    recalcPackaging: false,
  };
  const getResponse = handleRetries(splitOrderLimiter);
  const res = await getResponse(token, numId, data);
  return res;
}

async function processOrderSplitting(
  token,
  numId,
  orderId,
  fulfilmentLocationId,
  items,
  splitData,
) {
  if (splitData.length === 1) return splitData;
  let isLessThan14kg = false; // less than and equal to 14kg packages
  let isMoreThan14kg = false; // more than 14kg packages
  console.log("splitData: ", splitData);
  splitData.map((pkg) => {
    if (pkg[0].totalWeight <= 14) isLessThan14kg = true;
  });
  splitData.map((pkg) => {
    if (pkg[0].totalWeight > 14) isMoreThan14kg = true;
  });
  if (!(isLessThan14kg && isMoreThan14kg)) return splitData; // don't continue if only one type of packages are present
  const splitItemsArr = []; // contains item to split out to a new order
  const newSplitData = []; // contains the updated split data
  for (let i = 0; i < splitData.length; i++) {
    const pkg = splitData[i];
    if (pkg[0].totalWeight > 14) {
      newSplitData.push(pkg);
      continue;
    }
    // store items that need to be splitted out
    for (let j = 1; j < pkg.length; j++) {
      const sku = pkg[j].sku;
      const item = items.find((item) => item.SKU === sku);
      splitItemsArr.push({
        RowId: item.RowId,
        Weight: item.Weight,
        UnitCost: item.UnitCost,
        Quantity: item.Quantity,
      });
    }
  }
  // perform splitting of items through API
  if (splitItemsArr.length > 0) {
    const res = await splitOrder(
      token,
      numId,
      orderId,
      "00000000-0000-0000-0000-000000000000",
      fulfilmentLocationId,
      splitItemsArr,
    );
    console.log(`split response: ${res}`);
  }
  return newSplitData;
}

export async function performSP(token, numId, order, sku_db) {
  try {
    let originalItemsData = order.Items;
    const isSplitData = await getOrderPkgCalcLimiter(token, [order.OrderId]);
    if (isSplitData.length > 0 && isSplitData[0].Bins.length > 0) {
      console.log("order splitted already, skipping");
      return null;
    }
    let items = order.Items.filter(
      (ele) => !ele.SKU.toLowerCase().includes("testd_6"),
    );
    if (!checkItemsSku(items)) {
      console.log(`skipping order ${order.NumOrderId}, contains exception sku`);
      return null;
    }
    if (!checkItemCombination(sku_db, items)) {
      console.log(
        `skippig order ${order.NumOrderId}, combination not found in db`,
      );
      return null;
    }
    const itemsArr = getItemsArray(items);
    let splitData = getSplitPackaging2(itemsArr, order.NumOrderId);
    if (splitData == null) {
      console.log(
        `failed to calculate split data for order ${order.NumOrderId}`,
      );
      return null;
    }
    orderItemsData[order.NumOrderId] = order.Items.map((item) => {
      return {
        ItemId: item.ItemId,
        SKU: item.SKU,
        ItemNumber: item.ItemNumber,
        Weight: item.Weight,
        Title: item.Title,
        RowId: item.RowId,
        Quantity: item.Quantity,
      };
    });
    // do splitting first
    try {
      splitData = await processOrderSplitting(
        token,
        order.NumOrderId,
        order.OrderId,
        order.FulfilmentLocationId,
        order.Items,
        splitData,
      );
    } catch (err) {
      console.log(`FAILED TO SPLIT ORDER ITEMS`);
      logError(err);
      return null;
    }

    let testd_6Count = 0;
    for (let i = 0; i < splitData.length; i++) {
      const bin = splitData[i];
      for (let j = 0; j < bin.length; j++) {
        const itemData = bin[j];
        //console.log(itemData.sku);
        if (itemData.hasOwnProperty("sku") && itemData.sku === ".TestD_6")
          testd_6Count++;
      }
    }
    console.log(`total test products in calc split data ${testd_6Count}`);
    try {
      // add retry logic
      const getOrderData = handleRetries(getOrderByNumIdLimiter);
      order = await getOrderData(token, numId);
    } catch (err) {
      console.log(`failed to fetch order ${order.NumOrderId}`);
      logError(err);
      return null;
    }
    let testd_6OrderCount = 0;
    order.Items.map((item) => {
      if (item.SKU.includes("TestD_6")) testd_6OrderCount++;
    });
    console.log(`total test products in order data ${testd_6OrderCount}`);
    const testd_6Add = testd_6Count - testd_6OrderCount;
    console.log(`test products to add: ${testd_6Add}`);
    if (testd_6Add > 0) {
      let createdDate = new Date();
      createdDate = createdDate.toISOString();
      const itemData = getTestD_6ProductData(
        order.OrderId,
        testd_6Add,
        createdDate,
      );
      try {
        // retry logic
        const addItemHandler = handleRetries(addOrderItemLimiter);
        await addItemHandler(token, itemData);
        const getOrderData = handleRetries(getOrderByNumIdLimiter);
        order = await getOrderData(token, numId);
      } catch (err) {
        console.log(`failed to add test items or get order data`);
        logError(err);
        return null;
      }
    }
    //return;
    let packagingData = null;
    try {
      const getPkgData = handleRetries(getOrderPkgCalcLimiter);
      packagingData = await getPkgData(token, [order.OrderId]);
    } catch (err) {
      console.log(`failed to fetch packagingdata for order: ${numId}`);
      logError(err);
      return null;
    }
    const skuMap = {};
    const itemWeightMap = {};
    for (let i = 0; i < order.Items.length; i++) {
      if (skuMap.hasOwnProperty(order.Items[i].SKU) === false) {
        itemWeightMap[order.Items[i].RowId] = {
          Weight: order.Items[i].Weight,
          SKU: order.Items[i].SKU,
          Title: order.Items[i].Title,
        };
        try {
          const getItemData = handleRetries(getInventoryItemLimiter);
          const itemData = await getItemData(
            token,
            order.Items[i].StockItemId,
            order.Items[i].SKU,
          );
          skuMap[order.Items[i].SKU] = {
            ...itemData,
            RowId: order.Items[i].RowId,
          };
        } catch (err) {
          console.log(
            `failed to fetch item data of ${order.Items[i].SKU}, for order: ${order.NumOrderId}`,
          );
          logError(err);
          return null;
        }
      }
    }
    const bins = [];
    let maxHeight = 0;
    let maxWidth = 0;
    let maxDepth = 0;
    let orderTotalWeight = 0;
    splitData.map((bin) => (orderTotalWeight += bin[0].totalWeight)); // CHECK THIS!!
    for (let i = 0; i < splitData.length; i++) {
      const pkg = splitData[i];
      //console.log(pkg);
      const pkBinId = uuidv4();
      const binItems = [];
      let binHeight = 0;
      let binDepth = 0;
      let binWidth = 0;
      let binPackageCategoryID = "00000000-0000-0000-0000-000000000000";
      let testGroup = false;
      for (let j = 0; j < pkg.length; j++) {
        const item = pkg[j];
        if (!item.hasOwnProperty("sku")) continue;
        binHeight = Math.max(skuMap[item.sku].Height, binHeight);
        binWidth = Math.max(skuMap[item.sku].Width, binWidth);
        binDepth = Math.max(skuMap[item.sku].Depth, binDepth);
        maxHeight = Math.max(maxHeight, binHeight);
        maxWidth = Math.max(maxWidth, binWidth);
        maxDepth = Math.max(maxDepth, binDepth);
        if (
          testGroup === false &&
          skuMap[item.sku].PackageGroupId !== binPackageCategoryID
        ) {
          binPackageCategoryID = skuMap[item.sku].PackageGroupId;
          testGroup = true;
        }
        binItems.push({
          ShippingOrderItemId: 0,
          BinId: "00000000-0000-0000-0000-000000000000",
          fkOrderItemId: skuMap[item.sku]?.RowId || null,
          Quantity: 1,
        });
      }
      let fkPackagingTypeId = "00000000-0000-0000-0000-000000000000";
      for (let p = 0; p < pkgGroupsArr.length; p++) {
        if (pkgGroupsArr[p].PackageCategoryID === binPackageCategoryID) {
          fkPackagingTypeId = pkgGroupsArr[p].PackageTypes[0].PackageTypeId;
          if (
            pkgGroupsArr[p].PackageTypes[0].PackageTitle.trim()
              .toLocaleLowerCase()
              .includes("prime parcel")
          ) {
            binHeight = pkgGroupsArr[p].PackageTypes[0].Height;
            binWidth = pkgGroupsArr[p].PackageTypes[0].Width;
            binDepth = pkgGroupsArr[p].PackageTypes[0].Depth;
            break;
          }
          binHeight = Math.max(
            binHeight,
            pkgGroupsArr[p].PackageTypes[0].Height,
          );
          binDepth = Math.max(binDepth, pkgGroupsArr[p].PackageTypes[0].Depth);
          binWidth = Math.max(binWidth, pkgGroupsArr[p].PackageTypes[0].Width);
          maxHeight = Math.max(maxHeight, binHeight);
          maxWidth = Math.max(maxWidth, binWidth);
          maxDepth = Math.max(maxDepth, binDepth);
          break;
        }
      }
      const bin = {
        pkBinId,
        TrackingNumber: null,
        LabelId: null,
        Weight: pkg[0].totalWeight,
        Cost: null,
        fkPackagingTypeId,
        Width: binWidth,
        Height: binHeight,
        Depth: binDepth,
        PackagingWeight: 0.0,
        ItemWeight: pkg[0].totalWeight,
        ManualAdjust: true,
        Items: binItems,
      };
      bins.push(bin);
    }
    const reCalcData = {
      ...packagingData[0],
      TotalWeight: orderTotalWeight,
      ItemWeight: orderTotalWeight,
      TotalHeight: maxHeight,
      TotalWidth: maxWidth,
      TotalDepth: maxDepth,
      ManualAdjust: true,
      SplitPackageCount: bins.length,
      Bins: bins,
    };
    let saveReCalcData = null;
    try {
      const writeCalcData = handleRetries(setOrderPackagingSplitMOLimiter);
      saveReCalcData = await writeCalcData(token, reCalcData);
    } catch (err) {
      console.log(
        `failed to save split packaging calculation for order: ${numId}`,
      );
      logError(err);
      return null;
    }
    const data = {
      packagingData,
      reCalcData,
      saveReCalcData,
    };
    return splitData;
  } catch (err) {
    console.log(`pkg reCalculation failed for order: ${numId}`);
    logError(err);
    return null;
  }
}

function getItemsArray(items) {
  const arr = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].ItemId === "00000000-0000-0000-0000-000000000000") continue;
    // remove this item
    //if (items[i].Title.toLowerCase().includes("set")) continue;
    const skuStr = items[i].SKU.trim().toLowerCase();
    if (skuStr === "" || skuStr.includes(".testd_6")) continue;
    let cnt = items[i].Quantity;
    let extracted_sku = getSku(items[i].SKU.trim());
    while (cnt > 0) {
      arr.push({
        weight: items[i].Weight,
        sku: items[i].SKU,
        category: extracted_sku,
      });
      cnt--;
    }
  }
  arr.sort((a, b) => a.weight - b.weight);
  return arr;
}

function checkItemsSku(items) {
  if (
    items == null ||
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 8
  )
    return false;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.CompositeSubItems.length > 0) return false;
    if (item == null) return false;
    const sku = item.SKU;
    if (sku == null || typeof sku !== "string") return false;
    if (item.Quantity && item.Quantity > 4) return false;
    if (
      sku.toLowerCase().includes("mat") ||
      sku.toLowerCase().includes("roller") ||
      sku.toLowerCase().includes("rack") ||
      sku.toLowerCase().includes("barbell")
    )
      return false;
  }
  return true;
}

function getSku(itemSku) {
  for (let i = 0; i < skuTypes.length; i++) {
    if (itemSku.includes(skuTypes[i])) return skuTypes[i];
  }
  return null;
}

function checkItemCombination(sku_db, items) {
  if (items == null || !Array.isArray(items)) return false;
  let firstItemKey = "";
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemSku = item.SKU;
    const itemWeight = item.Weight;
    if (itemSku == null || itemWeight == null) continue;
    const itemKey = `${itemSku}|${itemWeight}`;
    //console.log(`itemKey: ${itemKey}`);
    if (!sku_db.hasOwnProperty(itemKey)) {
      console.log(`sku db has no data for ${itemKey}`);
      return false;
    }
    if (firstItemKey === "") {
      firstItemKey = itemKey;
      //console.log(`firstItemKey: ${firstItemKey}`);
      continue;
    } else if (!sku_db[firstItemKey].hasOwnProperty(itemKey)) {
      console.log(`sku db has no data for ${itemKey} in ${firstItemKey}`);
      return false;
    }
  }
  return true;
}
