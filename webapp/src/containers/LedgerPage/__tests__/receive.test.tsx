import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import {
  history,
  location,
  match,
} from '../../../utils/testUtils/routeComponentProps';
import ReceivePage from '../components/LedgerReceivePage';
import { Provider } from 'react-redux';
import store from '../../../app/rootStore';
import { mount } from 'enzyme';

describe('ReceivePage component', () => {
  it('should check for snapshot', () => {
    const wrapper = mount(
      <Router>
        <Provider store={store}>
          <ReceivePage history={history} location={location} match={match} />
        </Provider>
      </Router>
    );
    expect(wrapper).toMatchSnapshot();
  });
});
