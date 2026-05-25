<?php
/*
Module Name:	File Upload and Controls
Module Author:	AMS
Module Members:	
Module Properties:	
Module Methods:	
Module Version:	1.0.0
Module Date:	2010-04-16
Module Description:	handles file uploads and data controls
Module Help URL:	http://www.example.com/
*/
require_once DB_PATH."db_main_1.0.0.php";
class FileHandler extends MainDB{
	var $tableName;
	var $tableCategory;
	function __construct(){
		$this->tableName=TABLE_PREFIX."songs";
		$this->tableCategory=TABLE_PREFIX."sub_category";
	}
	function addFileInformation($fId, $fName, $fileName, $fileType, $fileCid, $fileAuthor, $fileDesc, $fileGroup=0){
		global $link;
		$uploadDate=date('Y-m-d h:i:s');
		$sql="INSERT INTO ".$this->tableName."(fid, fname, filename,filetype,cid,upload_date,author,description,group_id) values('{$fId}', '{$fName}', '{$fileName}','{$fileType}','{$fileCid}','{$uploadDate}', '{$fileAuthor}', '{$fileDesc}', '{$fileGroup}')";
		$res=mysql_query($sql);
		if(!$res){
			echo "Error: ".mysql_error();
		return false;
		}
		return mysql_insert_id();
	}
	
	function search(&$query,$book_id=0,$category_id=0,$sub_category_id=0,$ordfield=0,$order='desc',$start=0,$limit=10){
		global $link;            

		
       /*if(empty($query) || strlen($query)>120 || !is_numeric($limit))
			return false;*/
            // Commenting out as the search is going to be in Tamil and no need to do a strtolower
            // @todo : Check all the characters works after the change
		/*else
			$query=strtolower($query);	*/	


        $start=$start*$limit;
		$ord_fields=array('i.id','i.filename','c.cid','i.description');
	
		$sql="select SQL_CALC_FOUND_ROWS i.*,b.name,mc.cname as first_category,c.sub_cat_name as third_cat from sv_songs as i,";
		$sql.="sv_sub_category as c, sv_main_category as mc, sv_book AS b where ";

		if($book_id>0&&$category_id>0&&$sub_category_id>0)
			$filters="i.cid={$sub_category_id} AND c.main_category_id={$category_id} AND c.book_id={$book_id} ";
		else if($book_id>0&&$category_id>0)
			$filters="c.book_id={$book_id} AND c.main_category_id={$category_id}";
		else if($book_id>0&&$sub_category_id>0)
			$filters="c.book_id={$book_id} AND i.cid={$sub_category_id}";
		else if($book_id>0)
			$filters="c.book_id={$book_id}";
		else if($sub_category_id>0)
			$filters="i.cid={$sub_category_id}";
		else
			$filters='';

		
		if(is_numeric($query)){
			$filters.="( i.fid={$query}) {$filters}";
		}
		else{
	
			if(!empty($query) && $query!='search'){
				$filters.="( i.filename LIKE '%{$query}%' OR i.description LIKE '%{$query}%') {$filters}";

			}

		}
		
		$sql.="{$filters} AND c.id=i.cid AND c.main_category_id=mc.cid AND mc.book_id=b.book_id order by {$ord_fields[$ordfield]} {$order} limit {$start},{$limit}";            

/*echo $sql;exit;*/
		
		$res=mysql_query($sql);
		$fsql="select FOUND_ROWS();";
		$res2=mysql_query($fsql);
		$query=mysql_fetch_row($res2);
		
		if(!$res){
			echo "File Search Failed.".mysql_error();
			return false;
		}
	
		//echo mysql_num_rows($res);
		$rdata=array();
		while($data=mysql_fetch_assoc($res)){
			$rdata[]=$data;
		}

		return $rdata;
	}
}

?>