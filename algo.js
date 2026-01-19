function getSplitPackaging2(items, NumOrderId) {
  const n = items.length;
  const splitArr = [];
  const regularItems = items
    .filter((item) => item.weight <= 30)
    .map((item) => ({
      sku: item.sku,
      category: item.category,
      weight: item.weight,
    }));
  const heavyItems = items
    .filter((item) => item.weight > 30)
    .map((item) => ({
      weight: item.weight,
      sku: item.sku,
      category: item.category,
    }));
  regularItems.sort((a, b) => b.weight - a.weight);
  //console.log("regular items: ", regularItems);
  //console.log("heavy items: ", heavyItems);
  const categoryMap = {};
  for (let i = 0; i < regularItems.length; i++) {
    const item = regularItems[i];
    const category = item.category;
    if (categoryMap.hasOwnProperty(category) === false)
      categoryMap[category] = [];
    categoryMap[category].push(item);
  }
  for (const key in categoryMap) {
    if (categoryMap.hasOwnProperty(key)) {
      const itemsArr = categoryMap[key];
      itemsArr.sort((a, b) => b.weight - a.weight);
      categoryMap[key] = itemsArr;
    }
  }
  //console.log("category map: ", categoryMap);
  //console.log("processing heavy items....");
  for (let i = 0; i < heavyItems.length; i++) {
    const item = heavyItems[i];
    //console.log(`heavy item: ${item.sku}`);
    let isCombined = false;
    if (categoryMap.hasOwnProperty(item.category)) {
      const regularItemsArr = categoryMap[item.category];
      for (let j = 0; j < regularItemsArr.length; j++) {
        const regularItem = regularItemsArr[j];
        if (item.weight / 2 + regularItem.weight <= 30) {
          //console.log(`heavy item combined with ${regularItem.sku}`);
          let bin = [];
          const itemWt = item.weight / 2;
          bin.push({
            totalWeight: itemWt,
          });
          const regularItemWt = regularItem.weight + item.weight / 2;
          bin.push({
            sku: item.sku,
            category: item.category,
            weight: itemWt,
          });
          splitArr.push(bin);
          bin = [];
          bin.push({
            totalWeight: regularItemWt,
          });
          bin.push({
            sku: regularItem.sku,
            category: regularItem.category,
            weight: regularItemWt,
          });
          splitArr.push(bin);
          // remove regular item from categoryMap and regularItemsArr
          regularItemsArr.splice(j, 1);
          categoryMap[item.category] = regularItemsArr;
          const firstIndex = regularItems.findIndex(
            (ele) => ele.sku === regularItem.sku,
          );
          regularItems.splice(firstIndex, 1);
          isCombined = true;
          break;
        }
      }
    }
    if (!isCombined) {
      //console.log(`heavy item combined with test item`);
      const itemWt = item.weight / 2;
      let bin = [];
      bin.push({
        totalWeight: itemWt,
      });
      bin.push({
        sku: item.sku,
        category: item.category,
        weight: itemWt,
      });
      splitArr.push(bin);
      bin = [];
      bin.push({
        totalWeight: itemWt,
      });
      bin.push({
        sku: ".TestD_6",
        category: "TestD_6",
        weight: itemWt,
      });
      splitArr.push(bin);
    }
  }
  //console.log(`regular items after processing heavy items:`);
  //console.log(regularItems);
  //console.log('--------------');
  //regularItems.sort((a,b)=> b.weight - a.weight);
  let i = 0,
    j = regularItems.length - 1;
  while (i <= j) {
    const regularItem = regularItems[i];
    //console.log("sku: ", regularItem.sku);
    let wt = regularItem.weight;
    let bin = [];
    bin.push({
      totalWeight: wt,
    });
    bin.push({
      sku: regularItem.sku,
      category: regularItem.category,
      weight: regularItem.weight,
    });
    const orginalStart = j;
    while (i < j && wt + regularItems[j].weight <= 30) {
      wt += regularItems[j].weight;
      bin.push({
        sku: regularItems[j].sku,
        category: regularItems[j].category,
        weight: regularItems[j].weight,
      });
      j--;
    }
    if (orginalStart !== j) {
      bin[0].totalWeight = wt;
      regularItems.splice(j + 1, orginalStart - j);
    }
    const index = regularItems.findIndex((ele) => ele.sku === regularItem.sku);
    regularItems.splice(index, 1);
    //console.log("regular items afer splicing: ", regularItems);
    splitArr.push(bin);
    i = 0;
    j = regularItems.length - 1;
  }
  return splitArr;
}

export default getSplitPackaging2;
