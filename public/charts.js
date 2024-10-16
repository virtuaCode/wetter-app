

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


        var optionsPreci = {
            chart: {
              type: 'line'
            },
            series: [{
              name: 'sales',
              data: e.preci.data
            }],
            xaxis: {
              categories: e.preci.labels.map(el => new Date(el).getHours())
            }
          }
          
          var chartPreci = new ApexCharts(chartPreciElm, optionsPreci);
          
          chartPreci.render();
    })
})
