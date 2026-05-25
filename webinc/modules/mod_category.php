<?php
/*
Module Name:	Category Manager
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
class Category extends MainDB{
	
	var $tableName;
	
	function __construct(){
		$this->tableName=TABLE_PREFIX."main_category";
	}
	
	function add($book_id, $cname, $status){

		$sql ="INSERT INTO sv_main_category (book_id, cname,status) VALUES('{$book_id}','{$cname}','{$status}')";

		$res=mysql_query($sql);

		if(!$res){
			echo "fail";
			exit;
		}else{
			echo 'success';
			exit;
		}
	}

	function update($primary_category_id,$book_id,$categoryname,$status){
		
		$sql="UPDATE ".$this->tableName." SET book_id='{$book_id}', cname='{$categoryname}', status='{$status}' WHERE cid={$primary_category_id}";
		$res=mysql_query($sql);

		if(!$res){
			echo "fail";
		}else{
			echo 'success';
		}
		
		exit;	
	}

	function getCategoryDetailsbyID($cid){
		

		$sql="SELECT * FROM ".$this->tableName." where cid='{$cid}'";
		$res=mysql_query($sql);

		if(mysql_num_rows($res)>0)
		{
	        $data=mysql_fetch_assoc($res);
		}else{
			$data=array();			
		}

		return $data;
	}

	function getCategoryDetailsbyBookID($book_id){
		

		$sql="SELECT * FROM ".$this->tableName." where book_id='{$book_id}' and status='1'";
		$res=mysql_query($sql);

		$book_list=array();			

		if(mysql_num_rows($res)>0)
		{
			 while($data=mysql_fetch_assoc($res))
		    {

                  $book_list[]=$data;
				
		    }

		}

		return $book_list;
	}

	function checkCategoryNameCreateExistOrNot($category_name){
		

		$sql="SELECT * FROM ".$this->tableName." where cname='{$category_name}'";

		$res=mysql_query($sql);

		if( mysql_num_rows($res)>0)
		{
	        echo 'false';			

		}else{
			echo 'true';			

		}
		
		exit;
	}


	function checkCategoryNameUpdateExistOrNot($categoryname,$category_id){
		
		$sql="SELECT * FROM ".$this->tableName." where cname='{$categoryname}' and cid!='{$category_id}'";
		$res=mysql_query($sql);

		if( mysql_num_rows($res)>0)
		{
	        echo 'false';			

		}else{
			echo 'true';			

		}
		
		exit;
	}

	function getAllCategoryList(){
		

		$sql="SELECT category.*,sv_book.name AS 'book_name' FROM ".$this->tableName." as category left join sv_book on sv_book.book_id=category.book_id order by category.cid desc";

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