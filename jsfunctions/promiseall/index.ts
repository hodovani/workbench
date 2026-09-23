/**
 * @param {Array} iterable
 * @return {Promise<Array>}
 */
export default function promiseAll(iterable) {
    return new Promise((resolve, reject) => {
        const iterableSize = iterable.length;
        if (iterableSize === 0) {
            resolve([]);
        }
        const res = new Array();
        let count = 0;
        for (let i = 0; i < iterableSize; i++) {
            console.log(typeof iterable[i])
            if (iterable[i] instanceof Promise) {
                iterable[i]
                    .then((v) => {
                        res[i] = v;
                        count++;
                        if (count === iterableSize) {
                            resolve(res);
                        }
                    })
                    .catch((e) => reject(e));
            } else {
                res[i] = iterable[i];
                count++;
                if (count === iterableSize) {
                    resolve(res);
                }
            }
        }
    });
}
