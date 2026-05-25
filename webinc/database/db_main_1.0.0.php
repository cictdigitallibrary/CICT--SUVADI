<?php
// MAIN DATABASE CONTROLS
/*
Module Name:	Database Initializer
Module Author:	AMS
Module Members:	link, error
Module Properties: connect, getDBValue, setDBValue
Module Methods:	Connect, getDB
Module Version:	1.0.0
Module Date:	2010-01-04
Module Description:	
Module Help URL:	http://www.example.com/
*/
class MainDB{
	var $link;
	var $error;
function __construct($hostname,$port,$username,$password,$dbase){
		$this->connect($hostname,$port,$username,$password,$dbase);
}
function connect($hostname,$port,$username,$password,$dbase){
		if(!empty($port))
			$hostname=$hostname.':'.$port;
		$this->link=mysql_connect($hostname,$username,$password,false);
		if(!$this->link)
			die("DB Connection Error");
		mysql_query("SET character_set_results = 'utf8', character_set_client = 'utf8', character_set_connection = 'utf8', character_set_database = 'utf8', character_set_server = 'utf8'");
		if(mysql_select_db($dbase,$this->link)==FALSE)
			die("Could not find the Database");
}
function getDBValue($dbtable,$field,$whr="0") {
	$sql="select $field from $dbtable where $whr";
	$res=mysql_query($sql,$this->link);
	if(!$res){
		return 0;
	}
	$data=mysql_fetch_row($res);
return $data[0];
}

function setDBValue($uid,$dbtable,$field,$val,$whr=0) {
	if(empty($uid) || empty($db) || empty($field)){
		return 0;
	}
	if($whr)
		$sql="update $dbtable set $field=\"$val\" where $whr";
	else
		$sql="update $dbtable set $field=\"$val\" where uid='{$uid}'";
	$res=mysql_query($sql,$this->link);
	if(!$res) {
	return 0;
	}
return 1;
}
function begin()
{
	@mysql_query("SET autocommit=0; START TRANSACTION");
}
function commit()
{
	@mysql_query("COMMIT");
}
function rollback()
{
	@mysql_query("ROLLBACK");
}
function disconnect(){
	mysql_close($this->link);
}
function __destruct(){

}
}


?>