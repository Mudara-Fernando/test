
var chartsInitialized = false;
function drawChart(data, elem, placement, chartColors, tbody, title){
	if (!chartsInitialized)
		if (typeof google == 'undefined' || typeof google.charts == 'undefined'){
			setTimeout(function(){drawChart(data, elem, placement, chartColors, tbody);}, 200);
			return false;
		}
		else{
			google.charts.load('current', {'packages':['corechart']});
			chartsInitialized = true;
		}
	//
	var options = {fontName: 'Roboto, sans-serif'};
	//	========================================================================
	if (placement == 'total-license-products-pie'){
		options.chartArea = {left:10, right:10, bottom:10, top:10};
		options.pieSliceText = 'value';
		options.pieHole = 0.3;
		options.legend = 'none';
		if (typeof chartColors != 'undefined'){
			options.slices = {};
			//chartColors = eval('('+chartColors+')');
			for (var i = 0; i < chartColors.length; i++)
				options.slices[i] = {color: '#'+chartColors[i]};
		}
		google.charts.setOnLoadCallback(
			function(){
				data = google.visualization.arrayToDataTable(data);
				var chart = new google.visualization.PieChart(elem);
				chart.draw(data, options);
				//
				//	Connect table and chart for highlighting each other on hovering rows and pie segments
				if (typeof tbody != 'undefined'){
					var prevRow = false;
					google.visualization.events.addListener(chart, 'onmouseover',
						function(e){
							if (prevRow != tbody.rows[e.row]){
								if (prevRow != false)
									prevRow.removeClass('highlight');
								prevRow = tbody.rows[e.row];
								prevRow.addClass('highlight');
							}
						});
					google.visualization.events.addListener(chart, 'onmouseout',
						function(e){
							if (prevRow != false)
								prevRow.removeClass('highlight');
							prevRow = false;
						});
					//
					var setSelectionTimeout;
					for (var i = 0; i < tbody.rows.length; i++)
						new (function(i){
								tbody.rows[i].addEventListener('mousemove', function(){
									chart.setSelection([{'row':i}]);
									if (prevRow != false)
										prevRow.removeClass('highlight');
									prevRow = this;
									prevRow.addClass('highlight');
								});
								tbody.rows[i].addEventListener('mouseout', function(){
									chart.setSelection([{}]);
									if (prevRow != false)
										prevRow.removeClass('highlight');
									prevRow = false;
								});
							})(i);
					//	});
				}
			});
	}
	//	========================================================================
	else if (placement == 'total-license-dashboard-pie'){
		options.chartArea = {left:5, right:0, bottom:5, top:25};
		options.pieSliceText = 'value';
		options.pieHole = 0.3;
		options.hAxis = {format: 'MMM'};
		options.title = title;
		if (typeof chartColors != 'undefined'){
			options.slices = {};
			//chartColors = eval('('+chartColors+')');
			for (var i = 0; i < chartColors.length; i++)
				options.slices[i] = {color: '#'+chartColors[i]};
		}
		google.charts.setOnLoadCallback(
			function(){
				data = google.visualization.arrayToDataTable(data);
				var chart = new google.visualization.PieChart(elem);
				chart.draw(data, options);
			});
	}
	//	========================================================================
	/*else if (placement == 'total-license-by-salesperson'){
		options.chartArea = {left:5, right:0, bottom:5, top:25};
		options.pieSliceText = 'value';
		options.pieHole = 0.3;
		options.hAxis = {format: 'MMM'};
		options.title = title;
		if (typeof chartColors != 'undefined'){
			options.slices = {};
			//chartColors = eval('('+chartColors+')');
			for (var i = 0; i < chartColors.length; i++)
				options.slices[i] = {color: '#'+chartColors[i]};
		}
		google.charts.setOnLoadCallback(
			function(){
				data = google.visualization.arrayToDataTable(data);
				var chart = new google.visualization.PieChart(elem);
				chart.draw(data, options);
			});
	}*/
	//	========================================================================
	else if (placement == 'total-licenses-per-month'){
		options.chartArea = {left:48, right:28, bottom:40, top:20};
		options.pointSize = 5;
		options.legend = 'none';
		options.isStacked = true;
		options.series = {};
		options.series[0] = {color: '#439524'};
		options.series[1] = {color: '#953882'};
		google.charts.setOnLoadCallback(
			function(){
				data = google.visualization.arrayToDataTable(data);
				var chart = new google.visualization.AreaChart(elem);
				chart.draw(data, options);
			});
	}
	//	========================================================================
	else if (placement == 'total-revenue-per-month'){
		options.chartArea = {left:80, right:28, bottom:40, top:20};
		options.pointSize = 5;
		options.legend = 'none';
		options.isStacked = true;
		options.series = {};
		options.series[0] = {color: '#439524'};
		google.charts.setOnLoadCallback(function(){
            data = google.visualization.arrayToDataTable(data);
            var chart = new google.visualization.AreaChart(elem);
            chart.draw(data, options);
        });
	}
	//	========================================================================
	else if (placement == ''){
		options = {
			};
	}
	//	========================================================================
}
