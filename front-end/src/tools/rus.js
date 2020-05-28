export function StringMonth(month){
	switch (month){
		case 0: return 'января'
		case 1: return 'февраля'
		case 2: return 'марта'
		case 3: return 'апреля'
		case 4: return 'мая'
		case 5: return 'июня'
		case 6: return 'июля'
		case 7: return 'августа'
		case 8: return 'сентября'
		case 9: return 'октября'
		case 10: return 'ноября'
		case 11: return 'декабря'
		default: return month < 10?('0'+month):month
	}
}

export function numeral(count, one, two, five){
	//десять-девятнадцать
	if(count%100/10>>0 === 1)
		return five;
	//ноль, пять-девять
	if(count%10 >= 5 || count%10===0)
		return five;
	//один
	if(count%10 === 1)
		return one;

	//две-четыре
	return two;
}

export function getDate(timestamp, onlyDay){
	const time = new Date(timestamp);
	const nowDate = Date.now();
	const offset = time.getTimezoneOffset()*60*1000;

	const nowDay = (nowDate-offset)/(24*60*60*1000)>>0;

	const day = (timestamp-offset)/(24*60*60*1000)>>0;

	if(nowDay-day === 0){
		if(onlyDay === true)
			return "сегодня";
		const min = time.getMinutes();
		return time.getHours() + ':'+(min<10?'0'+min:min);
	}else if(nowDay-day === 1)
		return 'вчера'
	else
		return time.getDate() + ' ' + StringMonth(time.getMonth());
}