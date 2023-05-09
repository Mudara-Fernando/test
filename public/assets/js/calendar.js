
var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function calendar(input){
	var _self = this;
	var hoverLatch = false;
	//
	this.calBody = elem('div', '<div><button class="button">&#x25C0;</button><select></select><select></select><button class="button">&#x25b6;</button></div><table><thead><tr><th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th></tr></thead><tbody></tbody></table>', {class: 'calendar'});
	this.calBody.onmouseover = function(){
		hoverLatch = true;
	};
	this.calBody.onmouseout = function(){
		hoverLatch = false;
	};
	input.parentNode.insertBefore(this.calBody, input);
	var date = new Date(input.value);
	var inputFocusLatch = false;
	//
	var button = this.calBody.querySelectorAll('button');
	this.prevMonth = button[0];
	this.nextMonth = button[1];
	var select = this.calBody.querySelectorAll('select');
	this.selYear = select[0];
	this.selMonth = select[1];
	this.calTable = this.calBody.querySelector('table tbody');
	//
	for (var i = 0; i < months.length; i++){
		tmp = elem('option', months[i], {value: ('0'+(i+1)).substring((i+1).toString().length-1)});
		if (date.getMonth() == i)
			tmp.selected = true;
		this.selMonth.appendChild(tmp);
	}
	//
	for (var i = -4; i < 4; i++){
		tmp = elem('option', date.getFullYear()+i, {value: date.getFullYear()+i});
		if (i == 0)
			tmp.selected = true;
		this.selYear.appendChild(tmp);
	}
	//
	this.fillMonth = function(year, month){
		date.setYear(year);
		date.setMonth(month-1);
		date.setDate(1);
		date.setMinutes(date.getTimezoneOffset())
		//
		var inpDate = new Date(input.value);
		inpDate.setMinutes(inpDate.getTimezoneOffset());
		//
		var today = new Date();
		today.setMinutes(today.getTimezoneOffset());
		today = today.setDate(today.getDate()-1);
		//
		if (inpDate.getFullYear() == year && inpDate.getMonth() == month-1)
			inpDate = inpDate.getDate();
		else
			inpDate = false;
		_self.calTable.innerHTML = '';
		var row = _self.calTable.insertRow();
		for (var i = 0; i < date.getDay(); i++)
			row.appendChild(elem('td', ''));
		while (date.getMonth() == month-1){
			tmp = elem('td', date.getDate(), {class: inpDate==date.getDate() ? 'selected' : ''});
			row.appendChild(tmp);
			if (1459036800000 > date.getTime())
				tmp.addClass('future');
			else if (today > date.getTime())
				tmp.onclick = function(){
					input.value = _self.selYear.value+'-'+_self.selMonth.value+'-'+(('0'+this.innerHTML).substring(this.innerHTML.length-1));
					input.onchange();
					//inputFocusLatch = true;
					//input.focus();
					//input.parentNode.focus();
					window.onpopstate({forcePop: true});
					_self.calBody.style.display = 'none';
				}
			else
				tmp.addClass('future');
			date.setDate(date.getDate()+1);
			if (date.getDay() == 0)
				row = _self.calTable.insertRow();
		}
		for (var i = date.getDay(); i < 7; i++)
			row.appendChild(elem('td', ''));
		date.setMonth(date.getMonth()-1);
		inputFocusLatch = true;
		input.focus();
	}
	//
	input.onfocus = function(){
		_self.calBody.style.display = 'block';
		if (inputFocusLatch){
			inputFocusLatch = false;
			return;
		}
		//_self.fillMonth(_self.selYear.value, _self.selMonth.value);
		var tmp = input.value.split('-');
		_self.selYear.value = tmp[0];
		_self.selMonth.value = tmp[1];
		_self.fillMonth(tmp[0], tmp[1]);
	};
	input.onblur = function(){
		if (!hoverLatch)
			_self.calBody.style.display = 'none';
	};
	//
	this.selYear.onchange = this.selMonth.onchange = function(){
		_self.fillMonth(_self.selYear.value, _self.selMonth.value);
	}
	this.prevMonth.onclick = function(){
		date.setMonth(date.getMonth()-1);
		_self.selYear.value = date.getFullYear();
		tmp = 1*date.getMonth() + 1;
		_self.selMonth.value = ('0'+tmp).substring(tmp.toString().length-1);
		_self.fillMonth(_self.selYear.value, _self.selMonth.value);
		inputFocusLatch = true;
		input.focus();
	};
	this.nextMonth.onclick = function(){
		date.setMonth(date.getMonth()+1);
		_self.selYear.value = date.getFullYear();
		tmp = 1*date.getMonth() + 1;
		_self.selMonth.value = ('0'+tmp).substring(tmp.toString().length-1);
		_self.fillMonth(_self.selYear.value, _self.selMonth.value);
		inputFocusLatch = true;
		input.focus();
	};
	//
	/*this.selYear.onclick = this.selMonth.onclick = function(){
		this.focus();
	}*/
	this.selYear.onblur = this.selMonth.onblur = function(){
		if (!hoverLatch)
			_self.calBody.style.display = 'none';
		else{
			inputFocusLatch = true;
			input.focus();
		}
	}
	//
	_self.fillMonth(date.getFullYear(), (1*date.getMonth())+1);
	input.readOnly = true;
	this.calBody.style.display = 'none';
}
