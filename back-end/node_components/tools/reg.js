
//Здесь на запрещенные символы
module.exports.name = /^[а-яА-ЯёЁa-zA-Z0-9_\- ]+$/

//Здесь на запрещенные символы
module.exports.login = /^[а-яА-ЯёЁa-zA-Z0-9!@#$%^&*()-+ ]+$/

//Здесь только на латинские символы
module.exports.latin = /^[a-zA-Z ]+$/

module.exports.email = /^([A-Za-z0-9_\-.])+@([A-Za-z0-9_\-.])+.([A-Za-z]{2,4})$/