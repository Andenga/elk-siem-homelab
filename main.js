document.addEventListener("DOMContentLoaded", function () {
    const leftInput = document.getElementById("leftinput");
    const rightInput = document.getElementById("rightinput");
    const leftSelect = document.getElementById("lefttemparatures");
    const rightSelect = document.getElementById("righttemparatures");

    function updateConversion() {
        const leftValue = parseFloat(leftInput.value);
        if (isNaN(leftValue)) {
            rightInput.value = "";
            return;
        }

        const leftUnit = leftSelect.value.replace("left", "");
        const rightUnit = rightSelect.value.replace("right", "");

        let result;
        if (leftUnit === rightUnit) {
            result = leftValue;
        } else if (leftUnit === "Celsius") {
            if (rightUnit === "Fahrenheit") {
                result = (leftValue * 9) / 5 + 32;
            } else if (rightUnit === "Kelvin") {
                result = leftValue + 273.15;
            }
        } else if (leftUnit === "Fahrenheit") {
            if (rightUnit === "Celsius") {
                result = ((leftValue - 32) * 5) / 9;
            } else if (rightUnit === "Kelvin") {
                result = ((leftValue - 32) * 5) / 9 + 273.15;
            }
        } else if (leftUnit === "Kelvin") {
            if (rightUnit === "Celsius") {
                result = leftValue - 273.15;
            } else if (rightUnit === "Fahrenheit") {
                result = ((leftValue - 273.15) * 9) / 5 + 32;
            }
        }

        rightInput.value = result.toFixed(2);
    }
    leftInput.addEventListener("input", updateConversion);
    leftSelect.addEventListener("change", updateConversion);
    rightInput.addEventListener("input", updateConversion);
    rightSelect.addEventListener("change", updateConversion);

    updateConversion();
});
