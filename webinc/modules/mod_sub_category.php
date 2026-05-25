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
class SubCategory extends MainDB{
	
	var $tableName;
	
	function __construct(){
		$this->tableName=TABLE_PREFIX."sub_category";
	}
	
	function add($book_id,$category_id,$sub_category_name,$status){

		$sql ="INSERT INTO ".$this->tableName." (book_id,main_category_id, sub_cat_name,status) VALUES('{$book_id}','{$category_id}','{$sub_category_name}','{$status}')";

		$res=mysql_query($sql);

		if(!$res){
			echo "fail";
			exit;
		}else{
			echo 'success';
			exit;
		}
	}

	function update($primary_category_id,$book_id,$category_id,$sub_category_name,$status){
		
		$sql="UPDATE ".$this->tableName." SET book_id='{$book_id}',main_category_id={$category_id}, sub_cat_name='{$sub_category_name}', status='{$status}' WHERE id={$primary_category_id}";
		$res=mysql_query($sql);

		if(!$res){
			echo "fail";
		}else{
			echo 'success';
		}
		
		exit;	
	}

	function getSubCategoryDetailsbyID($cid){
		

		$sql="SELECT * FROM ".$this->tableName." where id='{$cid}'";
		$res=mysql_query($sql);

		if(mysql_num_rows($res)>0)
		{
	        $data=mysql_fetch_assoc($res);
		}else{
			$data=array();			
		}

		return $data;
	}

	
	function checkCategoryNameCreateExistOrNot($category_name){
		

		$sql="SELECT * FROM ".$this->tableName." where sub_cat_name='{$category_name}'";

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

	function getDropDownAllSubCategoryList(){
		

		$sql="SELECT sv_book.NAME AS 'book_name',sv_main_category.cname AS 'category_name',sub_category.* FROM ".$this->tableName." as sub_category
		left join sv_main_category on sv_main_category.cid=sub_category.main_category_id
		left join sv_book on sv_book.book_id=sv_main_category.book_id 
		where sv_book.status='1' and sv_main_category.status='1' AND sub_category.status='1' 
		order by sub_category.id desc";
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

	function getAllSubCategoryList(){
		

		$sql="SELECT sv_book.NAME AS 'book_name',sv_main_category.cname AS 'category_name',sub_category.* FROM ".$this->tableName." as sub_category
		left join sv_main_category on sv_main_category.cid=sub_category.main_category_id
		left join sv_book on sv_book.book_id=sv_main_category.book_id 
		order by sub_category.id desc";
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

	function getSubCategorylist($book_id){
		

		$sql="SELECT * FROM sv_main_category where book_id='{$book_id}' and status='1'";

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

	function getMainSubCategorylist($main_category_id){
		

		$sql="SELECT * FROM sv_sub_category where main_category_id='{$main_category_id}' and status='1'";

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