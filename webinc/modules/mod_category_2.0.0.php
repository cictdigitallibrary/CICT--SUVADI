<?php
/*
Module Name:	Category Manager
Module Author:	AMS
Module Members:	
Module Properties:	
Module Methods:	
Module Version:	1.0.0
Module Date:	2010-04-26
Module Description:	To manage categories and sub-categories using Nested Set Model
Module Help URL:	http://www.example.com/categories/
*/
require_once DB_PATH."db_main_1.0.0.php";
class Category extends MainDB{
	var $tableName;
	function __construct(){
		$this->tableName=TABLE_PREFIX."category";
	}
	
	function add($cname, $parent, $description=''){
		// adds a new node on existing category
		global $link;
		$sql="LOCK TABLE ".$this->tableName." WRITE;";
		$sql.="SELECT @myRight := rgt FROM ".$this->tableName." WHERE cname = '{$parent}';";
		$sql.="UPDATE ".$this->tableName." SET rgt = rgt + 2 WHERE rgt > @myRight;";
		$sql.="UPDATE ".$this->tableName." SET lft = lft + 2 WHERE lft > @myRight;";
		$sql.="INSERT INTO ".$this->tableName."(cname, lft, rgt, description) VALUES('{$cname}', @myRight + 1, @myRight + 2, '{$description}');";
		$sql.="UNLOCK TABLES;";
		$res=mysql_query($sql);
		if(!$res){
			echo "Adding New Category failed.";
		return false;
		}
	return true;
	}
	
	function remove(&$id,&$leaveChild=FALSE){
		// alias to delte
		$this->delete(&$id,&$leaveChild);
	}
	
	function delete($id,$leaveChild=FALSE){
		// removes/deletes an existing node of category
		global $link;
		$sql="LOCK TABLE ".$this->tableName." WRITE;";
		$sql.="SELECT @myLeft := lft, @myRight := rgt, @myWidth := rgt - lft + 1 FROM ".$this>tableName." WHERE id = '{$id}';";
		$sql.="DELETE FROM ".$this->tableName." WHERE lft BETWEEN @myLeft AND @myRight;";
		if($leaveChild==TRUE)
			$sql.="UPDATE ".$this->tableName." SET rgt = rgt - 1, lft = lft - 1 WHERE lft BETWEEN @myLeft AND @myRight;";
		$sql.="UPDATE ".$this->tableName." SET rgt = rgt - @myWidth WHERE rgt > @myRight;";
		$sql.="UPDATE ".$this->tableName." SET lft = lft - @myWidth WHERE lft > @myRight;";
		$sql.="UNLOCK TABLES;";
		$res=mysql_query($sql);
		if(!$res){
			echo "Deleting a Node Failed.";
		return false;
		}
	return mysql_affected_rows();
	}
	
	function fullTree($id, $nested=0){
		// retrieve full tree of a node
		global $link;
		if(empty($id))
			return false;
		if($nested)
			$sql.="SELECT node.id, node.cname, CONCAT(REPEAT(' -',(COUNT(parent.id) - 1)), node.cname) AS pcount, COUNT(node.id) AS ccount ";
		else
			$sql="SELECT node.cname ";
		echo $sql.="FROM ".$this->tableName." AS node, ".$this->tableName." AS parent WHERE node.lft BETWEEN parent.lft AND parent.rgt GROUP BY node.cname ORDER BY node.lft";
		echo BR;
		$res=mysql_query($sql);
		if(!$res){
			echo "Full tree Retrival Failed.";
		return false;
		}
		$rdata=array();
		while($data=mysql_fetch_assoc($res)){
			$rdata[]=$data;
		}
	return $rdata;
	}
	
	function update($id, $cname, $description){
		// update category data
		if(empty($id) OR empty($params))
			return false;
		global $link;
		$sql="UPDATE ".$this->tableName." SET cname='{$cname}', description= '{$description}' WHERE id={$id}";
		$res=mysql_query($sql);
		if(!$res){
			echo "Update failed.";
		return false;
		}
	return mysql_affected_rows();
	}
	function leafNodes(){
		// finds all leaf node for a parent node
		global $link;
		$sql="SELECT cname FROM ".$this->tableName." WHERE rgt = lft + 1";
		$res=mysql_query($sql);
		if(!$res){
			echo "Leaf Nodes Retrival Failed.";
		return false;
		}
		$rdata=array();
		while($data=mysql_fetch_row($res)){
			$rdata[]=$data;
		}
	return $rdata;
	}
	function singlePath($parent){
		// retrieve a single path for a node
		if(empty($parent))
			return false;
		global $link;
		$sql="SELECT parent.cname FROM ".$this->tableName." AS node, ".$this->tableName." AS parent WHERE node.lft BETWEEN parent.lft AND parent.rgt ";
		$sql.=" AND node.cname = '{$parent}' ORDER BY parent.lft";
		$res=mysql_query($sql);
		if(!$res){
			echo "Single Path Retrival Failed.";
		return false;
		}
		$rdata=array();
		while($data=mysql_fetch_row($res)){
			$rdata[]=$data;
		}
	return $rdata;
	}
	
	function nodeDepth(){
		// get a list of node depth with count
		global $link;
		$sql="SELECT node.cname, (COUNT(parent.cname) - 1) AS depth FROM ".$this->tableName." AS node, ";
		$sql.=$this->tableName." AS parent WHERE node.lft BETWEEN parent.lft AND parent.rgt GROUP BY node.cname ORDER BY node.lft";
		$res=mysql_query($sql);
		if(!$res){
			echo "Node Depth Retrival Failed.";
		return false;
		}
		$rdata=array();
		while($data=mysql_fetch_row($res)){
			$rdata[]=$data;
		}
	return $rdata;
	}
	
	function subtreeDepth($id){
		// find depth of a sub-tree
		global $link;
		$sql="SELECT node.name, (COUNT(parent.name) - (sub_tree.depth + 1)) AS depth FROM ".$this->tableName." AS node, ";
		$sql.=$this->tableName." AS parent, ".$this->tableName." AS sub_parent,	( ";
		$sql.="	SELECT node.name, (COUNT(parent.name) - 1) AS depth FROM ".$this->tableName." AS node, ";
		$sql.=$this->tableName." AS parent WHERE node.lft BETWEEN parent.lft AND parent.rgt AND node.name = {$id} ";
		$sql.=" GROUP BY node.name	ORDER BY node.lft )AS sub_tree WHERE node.lft BETWEEN parent.lft AND parent.rgt ";
		$sql.="	AND node.lft BETWEEN sub_parent.lft AND sub_parent.rgt	AND sub_parent.name = sub_tree.name GROUP BY node.name ORDER BY node.lft;";
		
		$res=mysql_query($sql);
		if(!$res){
			echo "Subtree Depth Retrival Failed.";
		return false;
		}
		$rdata=array();
		while($data=mysql_fetch_row($res)){
			$rdata[]=$data;
		}
	return $rdata;
	}
	
	function immediateSubroutine($id){
		// find immediate sub-routine of a Node
		global $link;
		$sql="SELECT node.cname, (COUNT(parent.id) - (sub_tree.depth + 1)) AS depth FROM ".$this->tableName." AS node, ";
		$sql.=$this->tableName." AS parent, ".$this->tableName." AS sub_parent,	( ";
		$sql.="SELECT node.cname, (COUNT(parent.id) - 1) AS depth FROM ".$this->tableName." AS node, ";
		$sql.=$this->tableName." AS parent	WHERE node.lft BETWEEN parent.lft AND parent.rgt AND node.id = {$id} ";
		$sql.="	GROUP BY node.cname ORDER BY node.lft )AS sub_tree ";
		$sql.=" WHERE node.lft BETWEEN parent.lft AND parent.rgt AND node.lft BETWEEN sub_parent.lft AND sub_parent.rgt ";
		$sql.=" AND sub_parent.id = sub_tree.id GROUP BY node.id HAVING depth <= 1 ORDER BY node.lft;";
		$res=mysql_query($sql);
		if(!$res){
			echo "Immediate Subroutine Retrival Failed.";
		return false;
		}
		$rdata=array();
		while($data=mysql_fetch_row($res)){
			$rdata[]=$data;
		}
	return $rdata;
	}

}

?>