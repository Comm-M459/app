import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { I18n } from 'react-redux-i18n';
import { MdAdd, MdCompareArrows } from 'react-icons/md';
import { Button, ButtonGroup } from 'reactstrap';
import { NavLink as RRNavLink } from 'react-router-dom';
import Helmet from 'react-helmet';

import {
  CREATE_POOL_PAIR_PATH,
  DEFICHAIN_DEX_YOUTUBE_LINK,
  LIQUIDITY_MINING_YOUTUBE_LINK,
  TELEGRAM_ENGLISH_HELP_LINK,
} from '../../constants';
import styles from './liquidity.module.scss';
import LiquidityList from './components/LiquidityList';
import { fetchPoolPairListRequest, fetchPoolsharesRequest } from './reducer';
import AvailablePoolPairsList from './components/AvailablePoolPairsList';
import LiquidityMining from '../../assets/svg/liquidity-mining.svg';
import DefichainDEX from '../../assets/svg/defichain-dex.svg';
import openNewTab from '../../utils/openNewTab';

interface LiquidityPageProps {
  history: History;
  poolshares: any;
  poolPairList: any;
  fetchPoolsharesRequest: () => void;
  fetchPoolPairListRequest: () => void;
  isLoadingPoolshares: boolean;
}

const LiquidityPage: React.FunctionComponent<LiquidityPageProps> = (
  props: LiquidityPageProps
) => {
  const {
    poolshares,
    fetchPoolsharesRequest,
    poolPairList,
    fetchPoolPairListRequest,
    isLoadingPoolshares,
  } = props;

  useEffect(() => {
    fetchPoolsharesRequest();
    fetchPoolPairListRequest();
  }, []);

  return (
    <div className='main-wrapper'>
      <Helmet>
        <title>{I18n.t('containers.liquidity.liquidityPage.title')}</title>
      </Helmet>
      <header className='header-bar'>
        <h1>{I18n.t('containers.liquidity.liquidityPage.liquidityPools')}</h1>
        <ButtonGroup>
          <Button to={CREATE_POOL_PAIR_PATH} tag={RRNavLink} color='link'>
            <MdAdd />
            <span className='d-lg-inline'>
              {I18n.t('containers.liquidity.liquidityPage.addLiquidity')}
            </span>
          </Button>
        </ButtonGroup>
      </header>
      {isLoadingPoolshares ? (
        <div className='content'>
          {I18n.t('containers.liquidity.liquidityPage.loading')}
        </div>
      ) : (
        <div className='content'>
          {!poolshares.length ? (
            <>
              <section>
                {I18n.t('containers.liquidity.liquidityPage.yourLiquidityInfo')}
              </section>
              <div className='d-flex justify-content-center m-5 '>
                <div
                  className={`${styles.cursorPointer} justify-content-center`}
                  onClick={() => openNewTab(LIQUIDITY_MINING_YOUTUBE_LINK)}
                >
                  <img src={LiquidityMining} height='96px' width='171px' />
                  <div className={`${styles.txtColor} text-center`}>
                    {I18n.t('containers.liquidity.liquidityPage.watchVideo')}
                  </div>
                </div>
                <div
                  className={`${styles.cursorPointer} justify-content-center`}
                  onClick={() => openNewTab(DEFICHAIN_DEX_YOUTUBE_LINK)}
                >
                  <img src={DefichainDEX} height='96px' width='171px' />
                  <div className={`${styles.txtColor} text-center`}>
                    {I18n.t('containers.liquidity.liquidityPage.watchVideo')}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <LiquidityList poolshares={poolshares} history={props.history} />
          )}
          <div>
            <section className={`${styles.sectionYourLliquidity} mb-5 mt-5`}>
              {I18n.t('containers.liquidity.liquidityPage.availablePoolPairs')}
            </section>
            <AvailablePoolPairsList
              searchQuery={''}
              poolPairList={poolPairList}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const mapStateToProps = (state) => {
  const {
    poolshares,
    isPoolsharesLoaded,
    isLoadingPoolshares,
    poolPairList,
  } = state.swap;
  return {
    poolPairList,
    poolshares,
    isPoolsharesLoaded,
    isLoadingPoolshares,
  };
};

const mapDispatchToProps = {
  fetchPoolsharesRequest,
  fetchPoolPairListRequest,
};

export default connect(mapStateToProps, mapDispatchToProps)(LiquidityPage);
