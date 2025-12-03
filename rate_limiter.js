import Bottleneck from "bottleneck";
import axios from "axios";
const LINNWORKS_BASE_URL = process.env.LINNWORKS_BASE_URL;
const getOrderByNumIdConfig = new Bottleneck({
  maxConcurrent: 1,
  minTime: 250, // Ensures spacing between requests
  reservoir: 240, // Also enforces total limit per minute
  reservoirRefreshAmount: 240,
  reservoirRefreshInterval: 60 * 1000,
});
export const getOrderByNumIdLimiter = getOrderByNumIdConfig.wrap(
  async (token, numId) => {
    try {
      const res = await axios({
        url: `${LINNWORKS_BASE_URL}/api/Orders/GetOrderDetailsByNumOrderId?OrderId=${numId}`,
        method: "GET",
        headers: {
          Authorization: token,
        },
      });
      if (res.status === 200) return res.data;
      else throw new Error(`FAILED TO FETCH ORDER DATA FOR ${numId}`);
    } catch (err) {
      console.log(`FAILED TO FETCH ORDER DATA FOR ${numId}`);
      throw err;
    }
  },
);
const getOrderPkgCalcConfig = new Bottleneck({
  maxConcurrent: 1,
  minTime: 500,
  reservoir: 120,
  reservoirRefreshAmount: 120,
  reservoirRefreshInterval: 60 * 1000,
});
export const getOrderPkgCalcLimiter = getOrderPkgCalcConfig.wrap(
  async (token, pkOrderIds) => {
    try {
      const res = await axios({
        url: `${LINNWORKS_BASE_URL}/api/Orders/GetOrderPackagingCalculation`,
        method: "POST",
        headers: {
          Authorization: token,
        },
        data: {
          pkOrderIds,
          Recalculate: true,
          SaveRecalculation: false,
        },
      });
      if (res.status !== 200)
        throw new Error(`FAILED TO FETCH PKG CALC FOR ORDERS: ${pkOrderIds}`);
      return res.data;
    } catch (err) {
      console.log(`FAILED TO FETCH PKG CALC FOR ORDERS: ${pkOrderIds}`);
      throw err;
    }
  },
);
const getInventoryItemConfig = new Bottleneck({
  maxConcurrent: 1,
  minTime: 500, // Ensures spacing between requests
  reservoir: 120, // Also enforces total limit per minute
  reservoirRefreshAmount: 120,
  reservoirRefreshInterval: 60 * 1000,
});
export const getInventoryItemLimiter = getInventoryItemConfig.wrap(
  async (token, id, sku) => {
    try {
      const res = await axios({
        url: `${LINNWORKS_BASE_URL}/api/Inventory/GetInventoryItem?stockItemId=${id}&sKU=${sku}`,
        method: "GET",
        headers: {
          Authorization: token,
        },
      });
      if (res.status !== 200)
        throw new Error(`FAILED TO FETCH INVENTORY ITEM ${sku}, ID: ${id}`);
      return res.data;
    } catch (err) {
      console.log(`FAILED TO FETCH INVENTORY ITEM ${sku}, ID: ${id}`);
      throw err;
    }
  },
);
const addOrderItemConfig = new Bottleneck({
  maxConcurrent: 1,
  minTime: 333,
  reservoir: 180,
  reservoirRefreshAmount: 180,
  reservoirRefreshInterval: 60 * 1000,
});
export const addOrderItemLimiter = addOrderItemConfig.wrap(
  async (token, data) => {
    try {
      const res = await axios({
        url: `${LINNWORKS_BASE_URL}/api/Orders/AddOrderItem`,
        method: "POST",
        headers: {
          Authorization: token,
        },
        data,
      });
      if (res.status !== 200) throw new Error(`FAILED TO ADD ITEM: ${data}`);
      return res.data;
    } catch (err) {
      console.log(`FAILED TO ADD ITEM: ${data}`);
      throw err;
    }
  },
);
const setOrderPackagingSplitMOConfig = new Bottleneck({
  // MO: manual overwrite
  maxConcurrent: 1,
  minTime: 500,
  reservoir: 120,
  reservoirRefreshAmount: 120,
  reservoirRefreshInterval: 60 * 1000,
});
export const setOrderPackagingSplitMOLimiter =
  setOrderPackagingSplitMOConfig.wrap(async (token, data) => {
    try {
      const res = await axios({
        url: `${LINNWORKS_BASE_URL}/api/Orders/SetOrderSplitPackagingManualOverwrite`,
        method: "POST",
        headers: {
          Authorization: token,
        },
        data: {
          request: data,
        },
      });
      if (res.status !== 200)
        throw new Error(`FAILED TO SET SPLIT MO, DATA: ${data}`);
      return res.data;
    } catch (err) {
      console.log(`FAILED TO SET SPLIT MO, DATA: ${data}`);
      throw err;
    }
  });
const removeOrderItemConfig = new Bottleneck({
  maxConcurrent: 1,
  minTime: 500,
  reservoir: 120,
  reservoirRefreshAmount: 120,
  reservoirRefreshInterval: 60 * 1000,
});
export const removeOrderItemLimiter = removeOrderItemConfig.wrap(
  async (token, data) => {
    try {
      const res = await axios({
        url: `${LINNWORKS_BASE_URL}/api/Orders/RemoveOrderItem`,
        method: "POST",
        headers: {
          Authorization: token,
        },
        data,
      });
      if (res.status !== 200) throw new Error(`FAILED TO REMOVE ITEM: ${data}`);
      return res.data;
    } catch (err) {
      console.log(`FAILED TO REMOVE ITEM: ${data}`);
      throw err;
    }
  },
);

const splitOrderConfig = new Bottleneck({
  maxConcurrent: 1,
  minTime: 500, // Ensures spacing between requests
  reservoir: 120, // Also enforces total limit per minute
  reservoirRefreshAmount: 120,
  reservoirRefreshInterval: 60 * 1000,
});
export const splitOrderLimiter = splitOrderConfig.wrap(
  async (token, numId, data) => {
    const res = await axios({
      url: `${LINNWORKS_BASE_URL}/api/Orders/SplitOrder`,
      method: "POST",
      headers: {
        Authorization: token,
      },
      data,
    });
    if (res.status === 200) return res.data;
    else throw new Error(`UNABLE TO SPLIT ORDER ${numId}!`);
  },
);
