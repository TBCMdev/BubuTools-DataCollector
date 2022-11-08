var API_KEY = ""
var ROOT = "http://127.0.0.1:5000/"
async function validate() {
    var api_key = document.getElementsByClassName("api-validate")
    fetch(ROOT + `validate/${api_key.value}`, {
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Origin": "*"
            // 'Content-Type': 'application/x-www-form-urlencoded',
        }
    }).then((data) => {
        var n = JSON.parse(data.data)
        console.log(n)
    })
}
async function sendRaw() {

}