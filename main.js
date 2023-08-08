function celsiusToFahrenheit(temp) {

    temp = (temp - 32) * 5/9  
    return `${temp}°C` 
}

function FahrenheitToCelsius(temp) {
    
    temp = (temp * 1.8) + 32 
    return `${temp}°F`
}

function FahrenheitToKelvin(temp) {

    temp = (temp - 273) * 9/5 + 32
    return `${temp}K`
}

function KelvintoFahrenheit(temp) {

    temp = (temp - 32) * 5/9 +273
    return `${temp}°F`    
}

function KelvintoCelsius(temp) {

    temp = temp + 273
    return `${temp}K`
}

function celsiusToKelvin(temp) {

    temp = temp - 273
    return `${temp}°C`
}


