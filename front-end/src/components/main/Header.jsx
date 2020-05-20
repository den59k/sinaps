import React from 'react'
import {Link} from 'react-router-dom'
import {IoIosArrowBack} from 'react-icons/io'

export default (props) => {

	return (
	<header className="main-header" {...props}>
		{false && <Link to={'/'} className="header-back-link"><IoIosArrowBack size="1.5em"/>Назад</Link>}
		{props.children}
	</header>
	)
}