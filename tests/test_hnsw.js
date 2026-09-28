const hnswlib = require('hnswlib-node');
const numDimensions = 3;
const index = new hnswlib.HierarchicalNSW('cosine', numDimensions);
index.initIndex(10);
index.addPoint([1, 0, 0], 0);
index.addPoint([0, 1, 0], 1);
index.addPoint([0, 0, 1], 2);

const result = index.searchKnn([1, 0.1, 0], 2);
console.log(result);
