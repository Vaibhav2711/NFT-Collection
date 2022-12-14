import Head from 'next/head'
import Image from 'next/image'
import { useState, useRef,useEffect } from 'react'
import Web3Modal from "web3modal";
import {Contract, providers, utils} from "ethers";
import { abi, NFT_CONTRACT_ADDRESS } from "../constants";
import styles from '../styles/Home.module.css'
import { getJsonWalletAddress } from 'ethers/lib/utils';

export default function Home() {
  
  const [tokenIds,setTokenIds] = useState(0);
  const [walletConnected,setWalletConnected]  = useState(false);
  const [loading,setLoading] = useState(false);
  const [isOwner,setIsOwner] = useState(false);
  const [presaleStarted,setPresaleStarted] = useState(false);
  const [presaleEnded,setPresaleEnded] = useState(false);
  const web3ModalRef = useRef();

  const getProviderorSigner = async (needSigner = false) =>{
    const provider  = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);
    const {chainId} = await web3Provider.getNetwork();
    if(chainId !== 5){
      window.alert("Connect to georli network");
      throw new Error('Connect to georli network');
    }
    if(needSigner == true){
      const signer = await web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };
  const connectWallet = async () => {
    try{
      await getProviderorSigner();
      setWalletConnected(true);
    }catch(err){
      console.error(err);
    }
  };

  const startPresale = async () =>{
    try{
      const signer = await getProviderorSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS,abi,signer);
      const tx = await nftContract.startPresale();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await checkIfPresaleStarted();
    }catch(err){
      console.error(err);
    }
  };

  const checkIfPresaleStarted = async () =>{
    try{
      const provider = await getProviderorSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS,abi,provider);
      const _presaleStarted = await nftContract.presaleStarted();
      if(!_presaleStarted){
        await getOwner();
      }
      setPresaleStarted(_presaleStarted);
      return(_presaleStarted);
    }catch(err){
      console.error(err);
      return(false);
    }
  };

  const checkIfPresaleEnded = async () => {
    try{
      const provider = await getProviderorSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS,abi,provider);
      const _presaleEnded = await nftContract.presaleEnded();
      //console.log(_presaleEnded);
      // _presaleEnded is a Big Number, so we are using the lt(less than function) instead of `<`
      // Date.now()/1000 returns the current time in seconds
      // We compare if the _presaleEnded timestamp is less than the current time
      // which means presale has ended
      const hasEnded = _presaleEnded < (Math.floor(Date.now() / 1000));
      if (hasEnded) {
        setPresaleEnded(true);
      } 
      else {
        setPresaleEnded(false);
      }
      //console.log(hasEnded);
      return hasEnded;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const getOwner = async () => {
    try{
      const provider = await getProviderorSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS,abi,provider);
      const _owner = await nftContract.owner();
      console.log(_owner);
      const signer = await getProviderorSigner(true);
      const _address = await signer.getAddress();
      if(_address.toLowerCase() == _owner.toLowerCase()){
        setIsOwner(true);
      }
    }catch(err){
      console.error(err);
    }
  };
  const presaleMint = async () => {
    try{
      const signer = await getProviderorSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS,abi,signer);
      const tx = await nftContract.presaleMint({value : utils.parseEther("0.01")});
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("NFT succesfully minted!!!");
    }catch(err){
      console.error(err);
    }
  };

  const publicMint = async() =>{
    try{
      const signer = await getProviderorSigner(true);
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS,abi,signer);
      const tx = await nftContract.mint({value: utils.parseEther("0.01")});
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("NFT successfully minted!!!");
    }catch(err){
      console.error(err);
    }
  };

  const getTokenIdsMinted = async () => {
    try{
      const provider = await getProviderorSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS,abi,provider);
      const _tokenIds = await nftContract.tokenIds();
      setTokenIds(_tokenIds.toString());
    }catch(err){
      console.error(err);
    }
  };
  useEffect( () =>{
    if(!walletConnected){
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInnjectedProvider: false,
      });
      connectWallet();
      const _presaleStarted = checkIfPresaleStarted();
      if(_presaleStarted){
        checkIfPresaleEnded();
      }
      getTokenIdsMinted();

      const presaleEndedInterval = setInterval(async function () {
        const _presaleStarted = await checkIfPresaleStarted();
        if (_presaleStarted) {
          const _presaleEnded = await checkIfPresaleEnded();
          if (_presaleEnded) {
            clearInterval(presaleEndedInterval);
          }
        }
      }, 5*1000);
      setInterval(async function () {
        await getTokenIdsMinted();
      }, 5 * 1000);
    }
    },[walletConnected]);
  const renderButton = () => {
        // If wallet is not connected, return a button which allows them to connect their wllet
        if(!walletConnected){
          return(
            <button className={styles.button} onClick = {connectWallet}>Connect Wallet!</button>
          );
        }
        // If we are currently waiting for something, return a loading button\
        if(loading){
          return(
            <button className={styles.button}>Loading...</button> 
          );
        }
        // If connected user is the owner, and presale hasnt started yet, allow them to start the presale
        if(isOwner && !presaleStarted){
          return(
            <button className={styles.button} onClick = {startPresale}>Start presale!</button>
          );
        }
        // If connected user is not the owner but presale hasn't started yet, tell them that
        if(!isOwner && !presaleStarted){
          return(
            <div>
              <div className={styles.description}> Sale not started !!</div>
            </div>
          );
        }
        // If presale started, but hasn't ended yet, allow for minting during the presale period
        if(presaleStarted && !presaleEnded){
          return(
            <div>
              <div className={styles.description}>
                Presale has started!!! If your address is whitelisted, Mint a Crypto
                Dev ????
              </div>
              <button className={styles.button} onClick={presaleMint}>
                Presale Mint ????
              </button>
            </div>
          );
        }
        // If presale started and has ended, its time for public minting\
        if (presaleStarted && presaleEnded) {
          return (
            <button className={styles.button} onClick={publicMint}>
              Public Mint ????
            </button>
          );
        }
      };


  return (
    <div>
      <Head>
        <title>Crypto Minions NFT</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}>
        <div>
        <h1 className={styles.title}>Welcome to Crypto Minions!</h1>
        <div className = {styles.description}>Its an NFT collection for fans of Minions</div>
        <div className = {styles.description}>{tokenIds}/10 have been minted</div>
        {renderButton()}
        </div>
        <div>
          <img className={styles.image} src = "./min2.png" /> 
        </div>
      </div>
      <footer className={styles.footer}>
        Made with &#10084; by Crypto Minions
      </footer>
    </div>
  );
}
