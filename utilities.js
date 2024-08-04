function res_error(res, reason) {
    res.statusCode = 400;
    res.send(reason);
}

module.exports = {res_error}