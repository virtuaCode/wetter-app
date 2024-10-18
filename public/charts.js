

const chartIconElm = document.querySelector("#chart-icon")
const chartPreciElm = document.querySelector("#chart-preci")
const url = document.querySelector("#chart").getAttribute("data-url")


fetch(url).then(res => {
    res.json().then(e => {
        const optionsIcon = {
            series: [{
                data: e.icons.data
            }],
            chart: {
                type: 'bar',
                height: 350
            },
            plotOptions: {
                bar: {
                    borderRadius: 4,
                    borderRadiusApplication: 'end',
                    horizontal: true,
                }
            },
            dataLabels: {
                enabled: false
            },
            xaxis: {
                categories: e.icons.labels,
            }
        };

        var chartIcon = new ApexCharts(chartIconElm, optionsIcon);
        chartIcon.render();

        var date = new Date()
        var options = {
            chart: {
                height: 350,
                type: "line",
                stacked: false
            },
            dataLabels: {
                enabled: false
            },
            colors: ["#247BA0", "#FF1654"],
            series: [

                {
                    name: "Regenmenge",
                    data: e.preci.data
                },

                {
                    name: "Temperatur",
                    data: e.temp.data
                },
            ],
            stroke: {
                width: [4, 4]
            },
            plotOptions: {
                bar: {
                    columnWidth: "20%"
                }
            },
            xaxis: {
                categories: e.preci.labels.map(el => new Date(el).getHours())
            },
            yaxis: [

                {
                    opposite: true,
                    axisTicks: {
                        show: true
                    },
                    axisBorder: {
                        show: true,
                        color: "#247BA0"
                    },
                    labels: {
                        style: {
                            colors: "#247BA0"
                        }
                    },
                    title: {
                        text: "Regenmenge in mm",
                        style: {
                            color: "#247BA0"
                        }
                    }
                },

                {

                    axisTicks: {
                        show: true
                    },
                    axisBorder: {
                        show: true,
                        color: "#FF1654"
                    },
                    labels: {
                        style: {
                            colors: "#FF1654"
                        }
                    },
                    title: {
                        text: "Temperatur in °C",
                        style: {
                            color: "#FF1654"
                        }
                    },
                    min: date.getMonth() >= 3 && date.getMonth() < 9 ? -10 : -15,
                    max: date.getMonth() < 3 || date.getMonth() >= 9 ? 25 : 40
                },
            ],
            tooltip: {
                shared: false,
                intersect: true,
                x: {
                    show: false
                }
            },
            legend: {
                horizontalAlign: "left",
                offsetX: 40
            },
            annotations: {
                yaxis: [{
                    y: 0,
                    borderColor: '#000000',
                    label: {
                        borderColor: '#000000',
                        style: {
                            color: '#fff',
                            background: '#000000'
                        },
                        text: '0 °C'
                    },
                    yAxisIndex: 1
                }]
            }
        };

        var chartPreci = new ApexCharts(chartPreciElm, options);

        chartPreci.render();
    })
})
