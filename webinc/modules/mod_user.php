<?php
/*
Module Name:	User Manager
Module Author:	AMS
Module Members:	tableName
Module Properties:	
Module Methods:	add, remove, delete, update
Module Version:	1.0.0
Module Date:	2010-04-26
Module Description:	To user using Adjucency Model
Module Help URL:	http://www.example.com/user/
*/
require_once DB_PATH."db_main_1.0.0.php";

class User extends MainDB{
	
	var $tableName;
	
	function __construct(){
		$this->tableName=TABLE_PREFIX."users";
	}
	
	function checkLogin($uname,$upass){

		$sql="SELECT uname, upass FROM ".$this->tableName." where uname='{$uname}' and upass='{$upass}' and status='1'";	

		$res=mysql_query($sql);

		if( mysql_num_rows($res)>0)
		{
			$status = 'set';
		}else{
			$status = 'not_set';
		}

		return $status;
	}

	function encryptIt( $q ) {
	    $cryptKey  = 'qJB0rGtIn5UB1xG03efyCp';
	    $qEncoded      = base64_encode( mcrypt_encrypt( MCRYPT_RIJNDAEL_256, md5( $cryptKey ), $q, MCRYPT_MODE_CBC, md5( md5( $cryptKey ) ) ) );
	    return( $qEncoded );
	}

	function decryptIt( $q ) {
	    $cryptKey  = 'qJB0rGtIn5UB1xG03efyCp';
	    $qDecoded      = rtrim( mcrypt_decrypt( MCRYPT_RIJNDAEL_256, md5( $cryptKey ), base64_decode( $q ), MCRYPT_MODE_CBC, md5( md5( $cryptKey ) ) ), "\0");
	    return( $qDecoded );
	}

}

?>