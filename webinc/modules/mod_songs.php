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

class Songs extends MainDB{
	
	var $tableName;
	
	function __construct(){
		$this->tableName=TABLE_PREFIX."songs";
	}
	
	function getAllSongs(){
		

		$sql="SELECT songs.*,sv_sub_category.sub_cat_name AS 'sub_cat_name' FROM ".$this->tableName." as songs 
			 left join sv_sub_category on sv_sub_category.id=songs.cid order by songs.id desc";

		$res=mysql_query($sql);

		if( mysql_num_rows($res)>0)
		{
			 $songs_list = array();

			 while($data=mysql_fetch_assoc($res))
		    {

                  $songs_list[]=$data;
				
		    }

		    return $songs_list;

		}
	}

}

?>