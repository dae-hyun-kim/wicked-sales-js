import React from 'react';

export default class Header extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      navDropDown: false
    };
    this.changeView = this.changeView.bind(this);
    this.priceTotal = this.priceTotal.bind(this);
    this.changeViewToCatalog = this.changeViewToCatalog.bind(this);
    this.changeViewToAbout = this.changeViewToAbout.bind(this);
    this.changeViewToContact = this.changeViewToContact.bind(this);
    this.showNavDropDown = this.showNavDropDown.bind(this);
    this.showDropDown = this.showDropDown.bind(this);
  }

  changeView() {
    const changeViewMethod = this.props.setView;
    changeViewMethod('cart', {});
  }

  changeViewToCatalog() {
    const changeViewMethod = this.props.setView;
    changeViewMethod('catalog', {});
  }

  changeViewToAbout() {
    const changeViewMethod = this.props.setView;
    changeViewMethod('aboutUs', {});
  }

  changeViewToContact() {
    const changeViewMethod = this.props.setView;
    changeViewMethod('contactUs', {});
  }

  priceTotal() {
    if (this.props.cartItemList) {
      const totalPrice = this.props.cartItemList.reduce((prev, cur) => {
        return prev + cur.price;
      }, 0);
      const priceTotalReformat = (totalPrice / 100).toFixed(2);
      return priceTotalReformat;
    } else {
      return 0;
    }
  }

  showNavDropDown() {
    if (this.state.navDropDown === true) {
      return (
        <div className="fixed">
          <p onClick={this.changeViewToCatalog}>SHOP</p>
          <p onClick={this.changeViewToAbout}>ABOUT US</p>
          <p onClick={this.changeViewToContact}>CONTACT</p>
        </div>
      );
    }
  }

  showDropDown() {
    if (this.state.navDropDown === true) {
      this.setState({
        navDropDown: false
      });
    } else {
      this.setState({
        navDropDown: true
      });
    }
  }

  render() {
    return (
      <div className="website-header d-flex justify-content-between">
        <div className="header-content d-flex justify-content-center align-items-center">
          <div>
            <i className="fas fa-bars" onClick={this.showDropDown}></i>
            {this.showNavDropDown()}
          </div>
          <div onClick={this.changeViewToCatalog} className="nav">SHOP</div>
          <div onClick={this.changeViewToAbout} className="nav">ABOUT US</div>
          <div onClick={this.changeViewToContact} className="nav">CONTACT</div>
        </div>
        <div className="header-content d-flex justify-content-center logo-container">
          <img onClick={this.changeViewToCatalog} className="logo" src="images/logo.png" alt=""/>
        </div>
        <div className="header-content d-flex justify-content-center align-items-center">
          <i onClick={this.changeView} className="fas fa-shopping-cart fa-2x"></i>
          <span className="cost">{`(${this.props.cartItemCount})`}</span>
          <span className="cost">{`($${this.priceTotal()})`}</span>
        </div>
      </div>
    );
  }
}
