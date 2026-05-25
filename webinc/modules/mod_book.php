<?php
/*
Module Name:	Book Manager
Module Author:	Vinodh
Module Members:	tableName
Module Properties:	
Module Methods:	add, remove, delete, update
Module Version:	1.0.0
Module Date:	2019-02-09
Module Description:	To manage categories and sub-categories using Adjucency Model
Module Help URL:	http://www.example.com/categories/
*/
require_once DB_PATH."db_main_1.0.0.php";
class Book extends MainDB{
	
	var $tableName;
	
	function __construct(){
		$this->tableName=TABLE_PREFIX."book";
	}
	
	function add($name, $status){

		$sql ="INSERT INTO ".$this->tableName." (name, status) VALUES('{$name}','{$status}')";

		$res=mysql_query($sql);

		if(!$res){
			echo "fail";
			exit;
		}else{
			echo 'success';
			exit;
		}
	}

	function update($book_id, $book_name, $status){
		
		$sql="UPDATE ".$this->tableName." SET name='{$book_name}', status='{$status}' WHERE book_id={$book_id}";
		$res=mysql_query($sql);
		
		if(!$res){
			echo "fail";
		}else{
			echo 'success';
		}
		
		exit;	
	}

	function getBookDetailsbyID($book_id){
		

		$sql="SELECT * FROM ".$this->tableName." where book_id='{$book_id}'";
		$res=mysql_query($sql);

		if(mysql_num_rows($res)>0)
		{
	        $data=mysql_fetch_assoc($res);
		}else{
			$data=array();			
		}

		return $data;
	}
	
	function getBookCount(){
		

		$sql="SELECT COUNT(*) AS 'book_count'FROM ".$this->tableName."";
		$res=mysql_query($sql);

		if(mysql_num_rows($res)>0)
		{
	        $data=mysql_fetch_assoc($res);
		}else{
			$data=array();			
		}


		return $data;
	}

	
	function getMainCategoryCount(){
		

		$sql="SELECT COUNT(*) AS 'main_category_count'FROM sv_main_category";
		$res=mysql_query($sql);

		if(mysql_num_rows($res)>0)
		{
	        $data=mysql_fetch_assoc($res);
		}else{
			$data=array();			
		}


		return $data;
	}

	function getSubCategoryCount(){
		

		$sql="SELECT COUNT(*) AS 'sub_category_count'FROM sv_sub_category";
		$res=mysql_query($sql);

		if(mysql_num_rows($res)>0)
		{
	        $data=mysql_fetch_assoc($res);
		}else{
			$data=array();			
		}


		return $data;
	}		

	function getSongsCount(){
		

		$sql="SELECT COUNT(*) AS 'songs_count'FROM sv_songs";
		$res=mysql_query($sql);

		if(mysql_num_rows($res)>0)
		{
	        $data=mysql_fetch_assoc($res);
		}else{
			$data=array();			
		}


		return $data;
	}	

	function getLastSixMonthCount(){
		

		$sql="SELECT
				YEAR(upload_date) AS YEAR,
				SUM(MONTH(upload_date) = 1) AS January,
				SUM(MONTH(upload_date) = 2) AS February,
				SUM(MONTH(upload_date) = 3) AS March,
				SUM(MONTH(upload_date) = 4) AS April,
				SUM(MONTH(upload_date) = 5) AS May ,
				SUM(MONTH(upload_date) = 6) AS June,
				SUM(MONTH(upload_date) = 7) AS July,
				SUM(MONTH(upload_date) = 8) AS August,
				SUM(MONTH(upload_date) = 9) AS September,
				SUM(MONTH(upload_date) = 10) AS October,
				SUM(MONTH(upload_date) = 11) AS November,
				SUM(MONTH(upload_date) = 12) AS December
				FROM sv_songs
				WHERE upload_date < Now() and  upload_date >= DATE_ADD(Now(), INTERVAL- 6 MONTH)
				GROUP BY 1;";
		
		$res=mysql_query($sql);

		if(mysql_num_rows($res)>0)
		{
	        $data=mysql_fetch_assoc($res);
		}else{
			$data=array();			
		}


		return $data;
	}	

	function checkCategoryNameExistOrNot($book_name,$book_id=null){
		

		if($book_name&&$book_id)
			$sql="SELECT book_id, name FROM ".$this->tableName." where name='{$book_name}' and book_id!='{$book_id}'";
		else
			$sql="SELECT book_id, name FROM ".$this->tableName." where name='{$book_name}'";

		$res=mysql_query($sql);

		if( mysql_num_rows($res)>0)
		{
	        echo 'false';			

		}else{
			echo 'true';			

		}
		
		exit;
	}

	function getAllBookList(){
		

		$sql="SELECT * FROM ".$this->tableName." order by book_id desc";
		$res=mysql_query($sql);

		if( mysql_num_rows($res)>0)
		{
			 $book_list = array();

			 while($data=mysql_fetch_assoc($res))
		    {

                  $book_list[]=$data;
				
		    }


		    return $book_list;

		}
	}

	function getAllActiveBookList(){
		

		$sql="SELECT * FROM ".$this->tableName." where status ='1' order by book_id desc";
		$res=mysql_query($sql);

		if( mysql_num_rows($res)>0)
		{
			 $book_list = array();

			 while($data=mysql_fetch_assoc($res))
		    {

                  $book_list[]=$data;
				
		    }


		    return $book_list;

		}
	}

}

?>